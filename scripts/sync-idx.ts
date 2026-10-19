/**
 * Sync the MLS Grid feed → local snapshot for the IDX site.
 *
 *   npm run sync:idx
 *
 * Pulls Property records (with Media) from the MLS Grid API v2, applies NWMLS
 * display-suppression via lib/idx/mlsgrid-map.ts, downloads photos locally, and
 * writes data/mlsgrid-snapshot.json — which MLSGridProvider serves at request time.
 *
 * Follows the MLS Grid Best-Practices Guide: gzip header, OriginatingSystemName
 * + MlgCanView filter, @odata.nextLink pagination, ≤2 req/s, media stored
 * locally (never hot-linked) with the OAuth token in the user-agent header.
 * See content/legal/nwmls-idx-vendor-requirements.md.
 *
 * Env (set in the shell, .env.local, or Netlify build env):
 *   MLSGRID_TOKEN              (required) OAuth2 token — demo token for staging
 *   MLSGRID_API_BASE           default https://api.mlsgrid.com/v2
 *   MLSGRID_ORIGINATING_SYSTEM default nwmls
 *   MLSGRID_MEDIA_REQUEST_BUDGET default 30000 — per-run media request cap
 *                              (MLS Grid enforces 40,000 requests per 24h)
 *
 * Remote-media mode (Supabase Storage) — active when BOTH are set:
 *   SUPABASE_URL               https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  service-role key (server-only secret)
 *   SUPABASE_MEDIA_BUCKET      default idx-media (created public if missing)
 * Photos then upload to the bucket instead of shipping inside the deploy
 * (full galleries ≈ 29GB — far beyond any deploy budget), snapshot image
 * paths become absolute bucket URLs, and media defaults flip to "everything"
 * (all photos, all listings) per NWMLS's staging-must-match-production
 * requirement (idx@nwmls.com, 2026-07-21). A manifest of uploaded object
 * keys lives in the bucket (state/uploaded.json), so a fresh CI runner skips
 * already-replicated photos without needing yesterday's disk.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import sharp from 'sharp'
import {
  mapResoToListing,
  mapMediaUrls,
  duplicatePrimaryId,
  deprefix,
  NO_PHOTO,
  type ResoRecord,
} from '../lib/idx/mlsgrid-map'
import {
  OWN_BROKERAGE_NAME,
  normalizeBrokerageName,
  type ListingDetail,
} from '../types/listing'
import { loadDotEnvLocal } from './load-env'
import { upsertListingsToDb } from './db'

const ROOT = process.cwd()
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'mlsgrid-snapshot.json')
const LOCAL_MEDIA_DIR = path.join(ROOT, 'public', 'idx')
// Remote mode keeps a gitignored local mirror (resumable backfills on a dev
// machine); CI runners work straight from the uploaded-keys manifest instead.
// The single-instance lock always lives here (one sync per machine, whatever
// bucket it targets). The media mirror itself is PER BUCKET — see mirrorDirFor.
const LOCK_DIR = path.join(ROOT, '.media-mirror')
const DEFAULT_BUCKET = 'idx-media'
const UPLOADED_MANIFEST_KEY = 'state/uploaded.json'
// Records which MLS Grid environment a bucket's contents came from, so demo
// and production data can never be mixed in one bucket (see assertBucketSource).
const SOURCE_STAMP_KEY = 'state/source.json'
// Published gzipped: at production scale the raw JSON exceeds the Storage
// object size limit. scripts/fetch-snapshot.ts gunzips it.
const SNAPSHOT_KEY = 'data/mlsgrid-snapshot.json.gz'

type RemoteMedia = {
  projectUrl: string
  serviceKey: string
  bucket: string
  publicBase: string // …/storage/v1/object/public/<bucket>
  uploaded: Set<string> // object keys confirmed present in the bucket
  dirtySinceFlush: number
}
let remote: RemoteMedia | null = null

/** Local mirror directory for a bucket. The default bucket keeps the original
 *  `.media-mirror/`; any other bucket gets its own directory, so photos
 *  downloaded from one MLS Grid environment are never re-uploaded as another's
 *  (listing ids can coincide between the demo and production feeds). */
function mirrorDirFor(bucket: string): string {
  return path.join(
    ROOT,
    bucket === DEFAULT_BUCKET ? '.media-mirror' : `.media-mirror-${bucket}`,
  )
}
let mirrorDir = LOCK_DIR
let keepMirror = true

function apiHost(apiBase: string): string {
  try {
    return new URL(apiBase).host
  } catch {
    return apiBase
  }
}

/** Refuse to sync one MLS Grid environment into a bucket that holds another's
 *  data. The uploaded-keys manifest makes the sync SKIP any photo key already
 *  in the bucket, so pointing a production token at the demo bucket would
 *  silently keep serving demo photos for every coinciding listing id. A bucket
 *  is stamped with its source on first use; buckets populated before the stamp
 *  existed are demo-era by definition. */
async function assertBucketSource(r: RemoteMedia, apiBase: string): Promise<void> {
  const host = apiHost(apiBase)
  const res = await storageFetch(
    r,
    'GET',
    `/storage/v1/object/${r.bucket}/${SOURCE_STAMP_KEY}`,
  )
  let stampedHost: string | null = null
  if (res.ok) {
    stampedHost = ((await res.json()) as { apiHost?: string }).apiHost ?? null
  } else if (r.uploaded.size > 0) {
    stampedHost = 'api-demo.mlsgrid.com' // pre-stamp bucket: demo-era contents
  }
  if (stampedHost && stampedHost !== host) {
    throw new Error(
      `Supabase bucket '${r.bucket}' holds data replicated from ${stampedHost}, ` +
        `but this run targets ${host}. Mixing environments in one bucket would ` +
        `serve the wrong photos. Set SUPABASE_MEDIA_BUCKET to a separate bucket ` +
        `for ${host} (it is created automatically).`,
    )
  }
  if (!res.ok) {
    const ok = await uploadObject(
      r,
      SOURCE_STAMP_KEY,
      Buffer.from(JSON.stringify({ apiHost: host, stampedAt: new Date().toISOString() })),
      'application/json',
    )
    if (!ok) throw new Error(`could not write ${SOURCE_STAMP_KEY} to bucket '${r.bucket}'`)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Global rate gate — MLS Grid enforces ≤2 requests/second across ALL requests
// (API + media). We space everything ≥550ms apart to stay safely under it.
let lastRequestAt = 0
async function gate(minMs = 700): Promise<void> {
  const wait = Math.max(0, lastRequestAt + minMs - Date.now())
  if (wait) await sleep(wait)
  lastRequestAt = Date.now()
}

function intEnv(name: string, fallback: number): number {
  const v = process.env[name]
  if (v === undefined || v.trim() === '') return fallback
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

// Per-run media request budget — an optional safety valve, default UNLIMITED.
// MLS Grid support (2026-07-30) confirmed images have NO rate limit; the
// "Request limit reached" 4xx streaks that earlier runs hit were EXPIRED
// signed MediaURLs (~1h lifetime), not a quota — fixed by the staleness
// refresh below. When a budget is set and runs out, the run stops REQUESTING
// new media but still finishes cleanly: remaining listings keep their data
// with NO_PHOTO, the snapshot publishes, and the next run resumes from the
// uploaded-keys manifest. Assigned in main() after .env.local loads.
let mediaRequestBudget = 0
let mediaRequests = 0
let consecutiveMediaExhaustions = 0
// Failure streak across PHOTOS (any cause — 4xx, dropped connections). With
// URL staleness handled, fifty photos failing in a row with zero successes
// means the host is genuinely refusing us, whatever the status code says.
let consecutivePhotoFailures = 0
let mediaStopReason: string | null = null

// Signed MediaURLs expire ~1 HOUR after harvest (support@mlsgrid.com,
// 2026-07-30: download images at the same time as the property records, not
// afterwards). We harvest every listing's URLs up front, so before the first
// real download for a listing whose URLs have aged past REFRESH_AGE_MS,
// re-fetch that listing's Media from the API (one gated request) and use the
// fresh URLs. Set in main(); null in reuse-only/data-only modes.
const URL_REFRESH_AGE_MS = 45 * 60 * 1000
let urlsHarvestedAt = 0
let refreshMediaUrls: ((id: string) => Promise<string[] | null>) | null = null

function stopMediaFetch(reason: string): void {
  if (mediaStopReason) return
  mediaStopReason = reason
  console.warn(
    `  ⚠ media fetch stopped: ${reason}. Remaining listings keep NO_PHOTO; ` +
      `the next sync run resumes from the uploaded-keys manifest.`,
  )
}

type ODataPage = { value?: ResoRecord[]; '@odata.nextLink'?: string }

async function fetchJson(url: string, token: string): Promise<ODataPage> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    await gate()
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Accept-Encoding': 'gzip,deflate',
      },
    })
    if (res.status === 429 || res.status >= 500) {
      const wait = attempt * 2000
      console.warn(`  ↻ ${res.status} from API; retrying in ${wait}ms (attempt ${attempt})`)
      await sleep(wait)
      continue
    }
    if (!res.ok) {
      throw new Error(`MLS Grid request failed ${res.status}: ${await res.text()}`)
    }
    return (await res.json()) as ODataPage
  }
  throw new Error(`MLS Grid request failed after retries: ${url}`)
}

/** Follow @odata.nextLink to the end, handing each Property record to
 *  `onRecord` as its page arrives (pages are not retained — the production
 *  feed is far too large to hold raw). Requests are sequential, one at a time.
 *  stopAfter > 0 stops paging once that many raw records were seen (local
 *  iteration cap only). Returns the number of raw records seen. */
async function fetchAllPages(
  firstUrl: string,
  token: string,
  onRecord: (raw: ResoRecord) => void,
  stopAfter = 0,
): Promise<number> {
  let count = 0
  let url: string | undefined = firstUrl
  let page = 0
  while (url) {
    const data = await fetchJson(url, token)
    const batch = data.value ?? []
    for (const raw of batch) onRecord(raw)
    count += batch.length
    page++
    console.log(`  page ${page}: +${batch.length} (total ${count})`)
    if (stopAfter && count >= stopAfter) break
    url = data['@odata.nextLink']
  }
  return count
}

const PRODUCTION_API_HOST = 'api.mlsgrid.com'

/** Delete bucket photos whose listing is no longer in the replicated set
 *  (aged out of a recency window, sold, or removed from the feed) and drop
 *  them from the manifest, so storage tracks the window instead of growing
 *  forever. Guarded: skipped when it would remove more than half the manifest
 *  (a sign of a bad run) unless MLSGRID_PRUNE_FORCE=true; MLSGRID_PRUNE=false
 *  disables it. */
async function pruneOrphanMedia(r: RemoteMedia, kept: ListingDetail[]): Promise<void> {
  if (process.env.MLSGRID_PRUNE === 'false') return
  const keepIds = new Set(kept.map((l) => l.id))
  const orphans = [...r.uploaded].filter((key) => {
    const m = key.match(/^idx\/([^/]+)\//)
    return m ? !keepIds.has(m[1]) : false
  })
  if (orphans.length === 0) return
  if (
    orphans.length > r.uploaded.size / 2 &&
    process.env.MLSGRID_PRUNE_FORCE !== 'true'
  ) {
    console.warn(
      `  ⚠ prune skipped: ${orphans.length} of ${r.uploaded.size} photos would be deleted ` +
        `(>50%). Set MLSGRID_PRUNE_FORCE=true if this is intended.`,
    )
    return
  }
  let deleted = 0
  for (let i = 0; i < orphans.length; i += 500) {
    const batch = orphans.slice(i, i + 500)
    const res = await storageFetch(
      r,
      'DELETE',
      `/storage/v1/object/${r.bucket}`,
      JSON.stringify({ prefixes: batch }),
      { 'Content-Type': 'application/json' },
    )
    if (!res.ok) {
      console.warn(`  ⚠ prune batch failed ${res.status}: ${await res.text()}`)
      continue
    }
    for (const k of batch) r.uploaded.delete(k)
    deleted += batch.length
  }
  await flushUploadedManifest(r, true)
  console.log(`  pruned ${deleted} photos of listings no longer in the window`)
}

/** Build the replication queries for the configured feed scope.
 *
 *    MLSGRID_STATUSES      comma list of StandardStatus values → one `in (...)` query
 *    MLSGRID_CLOSED_SINCE  ISO date → adds Closed listings modified after it
 *
 *  Neither set = every status in one query (what the demo feed used). The
 *  NWMLS production feed holds ~2.4M records (2.3M of them Closed), so an
 *  unscoped run against the production host is refused unless
 *  MLSGRID_ALLOW_FULL_FEED=true. Filters follow the MLS Grid rules: `in` not
 *  `or`, `gt` only on ModificationTimestamp, no parentheses around the
 *  replication fields. */
function buildScopeQueries(
  base: string,
  apiBase: string,
): { label: string; filter: string }[] {
  const statuses = (process.env.MLSGRID_STATUSES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const s of statuses) {
    if (!/^[A-Za-z]+$/.test(s)) throw new Error(`MLSGRID_STATUSES: invalid status '${s}'`)
  }
  // MLSGRID_CLOSED_DAYS=365 → a rolling window (recomputed every run, so sold
  // listings age out and the reconcile step removes them). MLSGRID_CLOSED_SINCE
  // is the fixed-date alternative.
  const closedDays = intEnv('MLSGRID_CLOSED_DAYS', 0)
  const closedSinceRaw =
    (closedDays
      ? new Date(Date.now() - closedDays * 86400_000).toISOString()
      : process.env.MLSGRID_CLOSED_SINCE?.trim()) ?? ''
  let closedSince = ''
  if (closedSinceRaw) {
    const d = new Date(closedSinceRaw)
    if (Number.isNaN(d.getTime())) {
      throw new Error(`MLSGRID_CLOSED_SINCE is not a date: '${closedSinceRaw}'`)
    }
    closedSince = d.toISOString()
  }

  if (statuses.length === 0 && !closedSince) {
    if (
      apiHost(apiBase) === PRODUCTION_API_HOST &&
      process.env.MLSGRID_ALLOW_FULL_FEED !== 'true'
    ) {
      throw new Error(
        'Refusing an unscoped import from the production feed (~2.4M records). ' +
          'Set MLSGRID_STATUSES (e.g. Active,ActiveUnderContract,Pending) and optionally ' +
          'MLSGRID_CLOSED_SINCE, or MLSGRID_ALLOW_FULL_FEED=true to really pull everything.',
      )
    }
    return [{ label: 'all statuses', filter: base }]
  }

  const queries: { label: string; filter: string }[] = []
  const open = statuses.filter((s) => s.toLowerCase() !== 'closed')
  if (open.length) {
    queries.push({
      label: open.join(', '),
      filter: `${base} and StandardStatus in (${open.map((s) => `'${s}'`).join(',')})`,
    })
  }
  if (closedSince) {
    queries.push({
      label: `Closed, modified after ${closedSince}`,
      filter: `${base} and StandardStatus eq 'Closed' and ModificationTimestamp gt ${closedSince}`,
    })
  } else if (statuses.some((s) => s.toLowerCase() === 'closed')) {
    queries.push({ label: 'Closed (all)', filter: `${base} and StandardStatus eq 'Closed'` })
  }
  return queries
}

// ── Supabase Storage (remote-media mode) ──────────────────────────────────────
/** Supabase Storage request. Storage has no MLS-style rate cap, so no gate(). */
async function storageFetch(
  r: RemoteMedia,
  method: string,
  pathname: string,
  body?: BodyInit,
  headers?: Record<string, string>,
): Promise<Response> {
  // Both header forms so legacy JWT service_role keys AND the newer
  // sb_secret_… API keys work (the latter are matched via `apikey`).
  return fetch(`${r.projectUrl}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${r.serviceKey}`,
      apikey: r.serviceKey,
      ...headers,
    },
    body,
  })
}

/** Upload one object (upsert), retrying transient failures. */
async function uploadObject(
  r: RemoteMedia,
  key: string,
  buf: Buffer,
  contentType: string,
): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await storageFetch(
        r,
        'POST',
        `/storage/v1/object/${r.bucket}/${key}`,
        new Uint8Array(buf),
        { 'Content-Type': contentType, 'x-upsert': 'true' },
      )
      if (res.ok) return true
      console.warn(`  ↻ upload ${key} → ${res.status} (attempt ${attempt})`)
    } catch (err) {
      console.warn(
        `  ↻ upload ${key} network error (${(err as Error).message}) (attempt ${attempt})`,
      )
    }
    await sleep(attempt * 1500)
  }
  console.warn(`  ⚠ upload failed for ${key}; will retry on a future run`)
  return false
}

/** Activate remote mode: ensure the public bucket exists and pull the
 *  uploaded-keys manifest so already-replicated photos are skipped even on a
 *  fresh CI runner (media is immutable, [Best Practices]). */
async function initRemoteMedia(apiBase: string): Promise<void> {
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !serviceKey) return
  // `||` not `??`: CI passes an empty string when the repo variable is unset.
  const bucket = process.env.SUPABASE_MEDIA_BUCKET?.trim() || DEFAULT_BUCKET
  const r: RemoteMedia = {
    projectUrl,
    serviceKey,
    bucket,
    publicBase: `${projectUrl}/storage/v1/object/public/${bucket}`,
    uploaded: new Set(),
    dirtySinceFlush: 0,
  }
  const create = await storageFetch(
    r,
    'POST',
    '/storage/v1/bucket',
    JSON.stringify({ id: bucket, name: bucket, public: true }),
    { 'Content-Type': 'application/json' },
  )
  // 400/409 = already exists; anything else is a config problem — stop early.
  if (!create.ok && create.status !== 400 && create.status !== 409) {
    throw new Error(
      `Supabase bucket check failed ${create.status}: ${await create.text()}`,
    )
  }
  const manifest = await storageFetch(
    r,
    'GET',
    `/storage/v1/object/${bucket}/${UPLOADED_MANIFEST_KEY}`,
  )
  if (manifest.ok) {
    const keys = (await manifest.json()) as string[]
    for (const k of keys) r.uploaded.add(k)
  }
  await assertBucketSource(r, apiBase)
  remote = r
  mirrorDir = mirrorDirFor(bucket)
  console.log(
    `Remote media: Supabase bucket '${bucket}' ` +
      `(${r.uploaded.size} objects already replicated; source ${apiHost(apiBase)})`,
  )
}

async function flushUploadedManifest(r: RemoteMedia, force = false): Promise<void> {
  if (!force && r.dirtySinceFlush < 500) return
  const ok = await uploadObject(
    r,
    UPLOADED_MANIFEST_KEY,
    Buffer.from(JSON.stringify([...r.uploaded])),
    'application/json',
  )
  if (ok) r.dirtySinceFlush = 0
}

/** Replicate one listing's photos and return the paths/URLs to serve.
 *  Media is immutable, so anything already in the local dir (local mode) or
 *  the bucket manifest (remote mode) is skipped ([Best Practices]). */
async function downloadMedia(
  id: string,
  urls: string[],
  token: string,
): Promise<string[]> {
  if (urls.length === 0) return []
  const dir = path.join(remote ? mirrorDir : LOCAL_MEDIA_DIR, id)
  const served: string[] = []
  let refreshed = false
  for (let i = 0; i < urls.length; i++) {
    // Re-encoded to jpeg on download, so the extension is always .jpg.
    const file = `${String(i).padStart(2, '0')}.jpg`
    const abs = path.join(dir, file)
    const key = `idx/${id}/${file}`
    const servedPath = remote ? `${remote.publicBase}/${key}` : `/${key}`

    if (remote?.uploaded.has(key)) {
      served.push(servedPath) // already in the bucket
      continue
    }

    // A local copy (mirror or public/idx) means the download already happened;
    // in remote mode it still needs uploading (e.g. resumed backfill).
    let buf: Buffer | null = null
    try {
      buf = await fs.readFile(abs)
    } catch {
      /* not on disk — download below */
    }
    if (!buf) {
      // Reuse-only mode: don't fetch missing media (e.g. during a media-host
      // rate-limit cooldown). Listings without photos fall back to NO_PHOTO.
      if (process.env.MLSGRID_NO_FETCH === 'true') continue
      if (mediaRequestBudget && mediaRequests >= mediaRequestBudget) {
        stopMediaFetch(`request budget (${mediaRequestBudget}) reached`)
      }
      if (mediaStopReason) continue
      // First real download for this listing with stale harvested URLs →
      // swap in fresh signed URLs (photo order is stable, so indexes align).
      if (
        !refreshed &&
        refreshMediaUrls &&
        Date.now() - urlsHarvestedAt > URL_REFRESH_AGE_MS
      ) {
        refreshed = true
        const fresh = await refreshMediaUrls(id)
        if (fresh && fresh.length) urls = fresh.slice(0, urls.length)
        if (i >= urls.length) break
      }
      const fetched = await fetchMediaBuffer(urls[i], token)
      if (!fetched) {
        if (++consecutivePhotoFailures >= 50) {
          stopMediaFetch('50 consecutive media failures — host is refusing requests')
        }
        continue // already warned
      }
      consecutivePhotoFailures = 0
      buf = await downscale(fetched)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(abs, buf)
    }

    if (remote) {
      if (!(await uploadObject(remote, key, buf, 'image/jpeg'))) continue
      remote.uploaded.add(key)
      remote.dirtySinceFlush++
      await flushUploadedManifest(remote)
      if (!keepMirror) await fs.unlink(abs).catch(() => {})
    }
    served.push(servedPath)
  }
  return served
}

// Downscale to keep the deploy small. Proportional resize preserves the NWMLS
// watermark (modifying/removing it is prohibited; scaling the whole image is
// not) — see [GUID #1]. withoutEnlargement keeps small originals untouched.
const PHOTO_MAX_WIDTH = 1400
async function downscale(buf: Buffer): Promise<Buffer> {
  try {
    return await sharp(buf)
      .rotate() // honor EXIF orientation
      .resize({ width: PHOTO_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()
  } catch {
    return buf // if sharp can't process it, store the original
  }
}

/** Fetch one media file, respecting the rate gate and backing off on 429.
 *  MLS Grid requires the OAuth token as the user-agent for media. */
async function fetchMediaBuffer(url: string, token: string): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    await gate()
    mediaRequests++
    // A dropped connection surfaces as fetch rejecting with "terminated" (and
    // arrayBuffer() can reject mid-stream too). Treat it like a 5xx: back off
    // and retry rather than letting it propagate — an unhandled throw here
    // would abort the whole sync and fail the Netlify build before the data
    // snapshot is written.
    try {
      const res = await fetch(url, { headers: { 'User-Agent': token } })
      if (res.status === 429 || res.status >= 500) {
        const w = attempt * 4000
        console.warn(`  ↻ media ${res.status}; backoff ${w}ms (attempt ${attempt})`)
        await sleep(w)
        continue
      }
      if (!res.ok) {
        console.warn(`  ⚠ media → ${res.status}; skipping`)
        return null
      }
      consecutiveMediaExhaustions = 0
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      const w = attempt * 4000
      console.warn(
        `  ↻ media network error (${(err as Error).message}); backoff ${w}ms (attempt ${attempt})`,
      )
      await sleep(w)
      continue
    }
  }
  // Every attempt 429/5xx/network-failed. A few in a row means the host is
  // refusing us outright (e.g. the 24h cap despite our budget — other runs
  // share it) — stop asking rather than burn days of backoff.
  if (++consecutiveMediaExhaustions >= 3) {
    stopMediaFetch('media host kept throttling despite backoff (429/5xx streak)')
  }
  console.warn(`  ⚠ media unavailable after retries; skipping`)
  return null
}

async function main() {
  await loadDotEnvLocal()

  const token = process.env.MLSGRID_TOKEN
  if (!token) {
    throw new Error(
      'MLSGRID_TOKEN is not set. Add it to .env.local (local) or the Netlify build environment. Use your DEMO subscription token for the staging site.',
    )
  }
  const apiBase = process.env.MLSGRID_API_BASE ?? 'https://api.mlsgrid.com/v2'
  const originatingSystem = process.env.MLSGRID_ORIGINATING_SYSTEM ?? 'nwmls'

  // Single-instance lock. Two concurrent runs on the same token double the
  // aggregate request rate past MLS Grid's 2/s cap — their 2026-07-30 email
  // traced our token suspension to exactly that (a 4/s burst from overlapping
  // runs). A dead run's lock is ignored via pid liveness.
  const lockPath = path.join(LOCK_DIR, 'sync.lock')
  await fs.mkdir(LOCK_DIR, { recursive: true })
  const priorPid = Number(await fs.readFile(lockPath, 'utf8').catch(() => '0'))
  if (priorPid > 0) {
    let alive = false
    try {
      process.kill(priorPid, 0)
      alive = true
    } catch {
      /* ESRCH — stale lock from a dead run */
    }
    if (alive) {
      throw new Error(
        `another sync-idx run (pid ${priorPid}) is already active — a second run would exceed MLS Grid's 2 req/s cap. Exiting.`,
      )
    }
  }
  await fs.writeFile(lockPath, String(process.pid))

  await initRemoteMedia(apiBase)

  // ALL listing DATA is ingested by default (MAX_LISTINGS=0 → every demo listing
  // is accessible for NWMLS's field-level review, idx@nwmls.com 2026-06-15),
  // paging @odata.nextLink to the end per the documented initial-import
  // procedure (content/legal/nwmls-idx-vendor-requirements.md).
  //
  // MEDIA is the bottleneck: requests are paced ≤2 req/s (images themselves
  // have no volume limit — support@mlsgrid.com 2026-07-30), so a full photo
  // replication (~147k photos) takes ~30h — it can only ever happen as a
  // resumable out-of-band backfill, never inside a deploy build.
  //
  //   Remote mode (Supabase set): defaults flip to EVERYTHING — all photos for
  //   all listings, per NWMLS's staging-must-match-production requirement
  //   (idx@nwmls.com, 2026-07-21). Already-replicated photos are skipped via
  //   the bucket manifest, so scheduled runs only fetch what's new.
  //
  //   Local mode (no Supabase): the legacy bounded demo defaults — one primary
  //   photo for 700 status-diverse listings so a token-only build stays inside
  //   the Netlify window; the rest show the NO_PHOTO placeholder.
  const MAX_LISTINGS = intEnv('MLSGRID_MAX_LISTINGS', 0)
  const MAX_PHOTOS = intEnv('MLSGRID_MAX_PHOTOS', remote ? 0 : 1)
  // Sold listings may carry fewer photos than on-market ones (NWMLS permits
  // but does not require additional photos on sold data). 0 = same as MAX_PHOTOS.
  const SOLD_MAX_PHOTOS = intEnv('MLSGRID_SOLD_MAX_PHOTOS', 0)
  // In remote mode the bucket is the store; keep the local mirror copy only on request.
  keepMirror = !remote || process.env.MLSGRID_KEEP_MIRROR === 'true'
  const MEDIA_MAX_LISTINGS = intEnv('MLSGRID_MEDIA_MAX_LISTINGS', remote ? 0 : 700)
  mediaRequestBudget = intEnv('MLSGRID_MEDIA_REQUEST_BUDGET', 0)

  // MLS Grid caps $expand requests at 1000 records/page (a larger $top errors),
  // so we request 1000/page and follow @odata.nextLink until it is absent —
  // ingesting every displayable listing across all statuses in one pass.
  const EXPAND_TOP_CAP = 1000

  console.log(
    `Syncing MLS Grid feed (OriginatingSystemName='${originatingSystem}', ` +
      `data: ${MAX_LISTINGS || 'all'} listings; ` +
      `media: ${MEDIA_MAX_LISTINGS || 'all'} listings × ${MAX_PHOTOS || '∞'} photos` +
      `${SOLD_MAX_PHOTOS ? ` (sold: ${SOLD_MAX_PHOTOS})` : ''}; ` +
      `media request budget: ${mediaRequestBudget || 'unlimited'})…`,
  )

  // Initial-import queries for the configured scope (see buildScopeQueries),
  // each paginated to the end via @odata.nextLink, strictly one after another.
  // Records are mapped as their page arrives: the mapper drops anything not
  // publicly displayable, duplicates keep only the primary ([GUID #4]).
  const baseFilter = `OriginatingSystemName eq '${originatingSystem}' and MlgCanView eq true`
  const queries = buildScopeQueries(baseFilter, apiBase)

  const listings: ListingDetail[] = []
  // Prefixed ListingIds, kept for API re-queries (the mapper strips prefixes
  // for display; the API requires them back — [GUID #5]).
  const prefixedIdByOwnId = new Map<string, string>()
  let suppressed = 0
  let duplicates = 0
  const ingest = (raw: ResoRecord): void => {
    const ownId = deprefix(
      typeof raw.ListingId === 'string' ? raw.ListingId : undefined,
    )
    if (ownId && typeof raw.ListingId === 'string') {
      prefixedIdByOwnId.set(ownId, raw.ListingId)
    }
    const primaryId = duplicatePrimaryId(raw)
    if (primaryId && primaryId !== ownId) {
      duplicates++
      return
    }
    const mapped = mapResoToListing(raw)
    if (!mapped) {
      suppressed++
      return
    }
    listings.push(mapped)
  }

  let rawCount = 0
  for (const q of queries) {
    console.log(`  query: ${q.label}`)
    const url = `${apiBase}/Property?$filter=${encodeURIComponent(q.filter)}&$expand=Media&$top=${EXPAND_TOP_CAP}`
    rawCount += await fetchAllPages(url, token, ingest, MAX_LISTINGS)
  }
  console.log(`  fetched ${rawCount} raw records (${listings.length} displayable)`)

  // Stale-URL refresher for downloadMedia (signed MediaURLs live ~1h; the
  // media pass runs for many hours). One gated API request re-harvests a
  // single listing's fresh URLs right before its photos download.
  urlsHarvestedAt = Date.now()
  refreshMediaUrls = async (id: string) => {
    const prefixed = prefixedIdByOwnId.get(id)
    if (!prefixed) return null
    try {
      const data = await fetchJson(
        `${apiBase}/Property?$filter=${encodeURIComponent(`ListingId eq '${prefixed}'`)}&$expand=Media&$top=1`,
        token,
      )
      const rec = data.value?.[0]
      return rec ? mapMediaUrls(rec) : null
    } catch (err) {
      console.warn(
        `  ⚠ media-url refresh for ${id} failed (${(err as Error).message}); using stale URLs`,
      )
      return null
    }
  }

  // Defensive de-dup by stable id: the feed can yield two records that map to
  // the same ListingId (re-lists, or a record modified mid-pagination), which
  // breaks React list keys and detail-page routing. Keep the first occurrence.
  const byId = new Map<string, ListingDetail>()
  for (const l of listings) if (!byId.has(l.id)) byId.set(l.id, l)
  const deduped = [...byId.values()]

  // Slugs come from the address, and the production feed has distinct listings
  // at one address (a parcel listed as both Residential and Land, several lots
  // on one road). A shared slug would resolve a detail page to the wrong
  // listing, so every listing in a colliding group gets its MLS number appended.
  const slugCounts = new Map<string, number>()
  for (const l of deduped) slugCounts.set(l.slug, (slugCounts.get(l.slug) ?? 0) + 1)
  let slugsDisambiguated = 0
  for (const l of deduped) {
    if ((slugCounts.get(l.slug) ?? 0) > 1) {
      l.slug = `${l.slug}-${l.id}`
      slugsDisambiguated++
    }
  }
  if (slugsDisambiguated) {
    console.log(`  ${slugsDisambiguated} listings shared a slug; MLS number appended`)
  }
  const idDupes = listings.length - deduped.length

  // Keep ALL listing data by default; a status-diverse subset only if a hard
  // MAX_LISTINGS cap is set ([no silent caps] — we log exactly what was dropped).
  const selected = MAX_LISTINGS ? selectDiverse(deduped, MAX_LISTINGS) : deduped
  const cappedListings = deduped.length - selected.length

  // Recency windows (objective date criteria — the site shows the Rule 9
  // exclusion disclosure whenever these are set):
  //   MLSGRID_LISTED_DAYS  keep on-market listings that came on market within N days
  //   MLSGRID_CLOSED_DAYS  keep sold listings that CLOSED within N days (the query
  //                        above pre-filters by ModificationTimestamp; CloseDate decides)
  // Listings without the relevant date cannot be shown to meet the criterion
  // and are excluded.
  const LISTED_DAYS = intEnv('MLSGRID_LISTED_DAYS', 0)
  const closedDays = intEnv('MLSGRID_CLOSED_DAYS', 0)
  const withinDays = (iso: string | undefined, days: number): boolean => {
    if (!iso) return false
    const t = Date.parse(iso)
    return Number.isFinite(t) && Date.now() - t <= days * 86400_000
  }
  let outsideWindow = 0
  const inWindow = selected.filter((l) => {
    if (l.status === 'sold') {
      if (closedDays && !withinDays(l.closedAt, closedDays)) return (outsideWindow++, false)
    } else if (LISTED_DAYS && !withinDays(l.listedAt, LISTED_DAYS)) {
      return (outsideWindow++, false)
    }
    return true
  })
  selected.length = 0
  selected.push(...inWindow)
  if (LISTED_DAYS || closedDays) {
    console.log(
      `  recency window: on-market ≤ ${LISTED_DAYS || '∞'} days, sold ≤ ${closedDays || '∞'} days ` +
        `→ ${selected.length} kept, ${outsideWindow} outside the window`,
    )
  }
  const feedPhotoCount = selected.reduce((n, l) => n + l.images.length, 0)
  console.log(
    `  feed lists ${feedPhotoCount} displayable photos across ${selected.length} listings`,
  )

  // Media subset: download photos for at most MEDIA_MAX_LISTINGS listings
  // (status-diverse). Listings outside it keep all their data but show NO_PHOTO.
  const skipMedia = process.env.MLSGRID_SKIP_MEDIA === 'true'
  const mediaSubset = MEDIA_MAX_LISTINGS
    ? selectDiverse(selected, MEDIA_MAX_LISTINGS)
    : selected
  const mediaIds = new Set(mediaSubset.map((l) => l.id))

  // Photo replication order: the member's own brokerage first (those are the
  // listings the homepage spotlight and /properties feature), then on-market
  // listings, then sold — so a multi-day backfill fills the most-seen pages first.
  const ownKey = normalizeBrokerageName(OWN_BROKERAGE_NAME)
  const mediaRank = (l: ListingDetail): number =>
    l.brokerageName && normalizeBrokerageName(l.brokerageName) === ownKey
      ? 0
      : l.status === 'sold'
        ? 2
        : 1
  selected.sort((a, b) => mediaRank(a) - mediaRank(b))

  // Localize media for the subset + stamp the "data obtained as of" timestamp on
  // EVERY record. MLSGRID_SKIP_MEDIA=true skips all downloads (fast data-only
  // iteration / media-host cooldown).
  const dataAsOf = new Date().toISOString()
  let withPhotos = 0
  for (const listing of selected) {
    if (skipMedia || !mediaIds.has(listing.id)) {
      listing.images = [NO_PHOTO]
    } else {
      const cap = listing.status === 'sold' && SOLD_MAX_PHOTOS ? SOLD_MAX_PHOTOS : MAX_PHOTOS
      const urls = cap ? listing.images.slice(0, cap) : listing.images
      // Media is best-effort: the DATA snapshot is the load-bearing output, so
      // one listing's photo failure must never abort the run (and fail the
      // Netlify build) before the snapshot is written. On failure the listing
      // keeps all its data and shows NO_PHOTO.
      let localImages: string[] = []
      try {
        localImages = await downloadMedia(listing.id, urls, token)
      } catch (err) {
        console.warn(
          `  ⚠ media for ${listing.id} failed (${(err as Error).message}); NO_PHOTO`,
        )
      }
      listing.images = localImages.length ? localImages : [NO_PHOTO]
      if (localImages.length) withPhotos++
    }
    listing.primaryImage = listing.images[0]
    listing.dataAsOf = dataAsOf
  }
  if (skipMedia) console.log('  (MLSGRID_SKIP_MEDIA=true — photos not downloaded)')

  // Surface photo-bearing listings first so default views (home spotlight,
  // unfiltered search) look populated while every listing stays searchable.
  selected.sort(
    (a, b) =>
      Number(b.primaryImage !== NO_PHOTO) - Number(a.primaryImage !== NO_PHOTO),
  )

  await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true })
  // Pretty-printed while small enough to eyeball; compact at production scale.
  const snapshotJson =
    (selected.length > 20000
      ? JSON.stringify(selected)
      : JSON.stringify(selected, null, 2)) + '\n'
  await fs.writeFile(SNAPSHOT_PATH, snapshotJson, 'utf8')

  // Remote mode: publish the snapshot + manifest so Netlify builds (via
  // scripts/fetch-snapshot.ts) and future CI runs pick up exactly this state.
  if (remote) {
    await flushUploadedManifest(remote, true)
    // Supabase Storage caps objects at 50 MB on this plan. The production scope
    // compresses to ~60 MB, so the snapshot is not publishable there — the DB
    // mirror below is the store the site reads in production anyway.
    const SNAPSHOT_UPLOAD_LIMIT = 50 * 1024 * 1024
    const gz = gzipSync(Buffer.from(snapshotJson))
    let ok = false
    if (gz.length > SNAPSHOT_UPLOAD_LIMIT) {
      console.log(
        `  snapshot not published (${(gz.length / 1e6).toFixed(0)} MB gz > Storage object limit); DB mirror is the store`,
      )
    } else {
      ok = await uploadObject(remote, SNAPSHOT_KEY, gz, 'application/gzip')
    }
    if (ok) {
      console.log(`  snapshot published to ${remote.publicBase}/${SNAPSHOT_KEY}`)
    } else if (gz.length <= SNAPSHOT_UPLOAD_LIMIT) {
      console.warn('  ⚠ snapshot upload failed; relying on the DB mirror')
    }

    // Mirror the snapshot into the Postgres `listings` table (Phase B store).
    // Non-fatal while the site still serves from the snapshot file: a DB
    // hiccup must not fail the sync. Reconciliation (deleting rows that left
    // the feed) only runs for uncapped, complete syncs.
    try {
      // MLSGRID_SKIP_DB=true leaves the `listings` table untouched (e.g. while
      // it still holds another environment's rows awaiting a manual swap).
      if (process.env.MLSGRID_SKIP_DB === 'true') {
        if (!ok) throw new Error('MLSGRID_SKIP_DB is set and the snapshot upload failed')
        console.log('  (MLSGRID_SKIP_DB=true — listings table not touched)')
      } else {
        await upsertListingsToDb(selected, { reconcile: MAX_LISTINGS === 0 })
        if (MAX_LISTINGS === 0) await pruneOrphanMedia(remote, selected)
      }
    } catch (err) {
      // One of the two published stores must hold this run's data.
      if (!ok) {
        throw new Error(
          `neither the snapshot nor the DB could be updated: ${(err as Error).message}`,
        )
      }
      console.warn(
        `  ⚠ DB upsert failed (non-fatal, snapshot remains authoritative): ${(err as Error).message}`,
      )
    }
  }

  const byStatus = selected.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})
  console.log(
    `\nDone. ${selected.length} listings written to data/mlsgrid-snapshot.json ` +
      `(${suppressed} suppressed, ${duplicates + idDupes} duplicates dropped` +
      (cappedListings > 0
        ? `, ${cappedListings} over the ${MAX_LISTINGS}-listing demo cap`
        : '') +
      `).`,
  )
  console.log(`  by status: ${JSON.stringify(byStatus)}`)
  console.log(
    `  ${withPhotos}/${selected.length} listings have photos ` +
      `(rest show NO_PHOTO; raise MLSGRID_MEDIA_MAX_LISTINGS for more).`,
  )
  console.log(
    `  media requests this run: ${mediaRequests}` +
      (mediaStopReason ? ` — stopped early: ${mediaStopReason}` : ''),
  )
  if (cappedListings > 0) {
    console.log(
      `  NOTE: demo is a capped sample of the ~feed; raise MLSGRID_MAX_LISTINGS to include more.`,
    )
  }
}

/** Round-robin across status buckets so a capped demo still surfaces every
 *  status type (for-sale, contingent, pending, sold). */
function selectDiverse(listings: ListingDetail[], max: number): ListingDetail[] {
  const buckets = new Map<string, ListingDetail[]>()
  for (const l of listings) {
    const arr = buckets.get(l.status) ?? []
    arr.push(l)
    buckets.set(l.status, arr)
  }
  const queues = [...buckets.values()]
  const out: ListingDetail[] = []
  let i = 0
  while (out.length < max && queues.some((q) => q.length > 0)) {
    const q = queues[i % queues.length]
    const next = q.shift()
    if (next) out.push(next)
    i++
  }
  return out
}

main()
  .then(async () => {
    await fs.unlink(path.join(LOCK_DIR, 'sync.lock')).catch(() => {})
  })
  .catch((err) => {
    console.error('\nsync-idx failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
