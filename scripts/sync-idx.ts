/**
 * Sync the MLS Grid feed → local snapshot for the IDX site.
 *
 *   npm run sync:idx
 *
 * Pulls Property records (with Media) from the MLS Grid API v2, applies NWMLS
 * display-suppression via lib/idx/mlsgrid-map.ts, downloads photos locally, and
 * writes data/mlsgrid-demo.json — which MLSGridProvider serves at request time.
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
import sharp from 'sharp'
import {
  mapResoToListing,
  duplicatePrimaryId,
  deprefix,
  NO_PHOTO,
  type ResoRecord,
} from '../lib/idx/mlsgrid-map'
import type { ListingDetail } from '../types/listing'
import { loadDotEnvLocal } from './load-env'

const ROOT = process.cwd()
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'mlsgrid-demo.json')
const LOCAL_MEDIA_DIR = path.join(ROOT, 'public', 'idx')
// Remote mode keeps a gitignored local mirror (resumable backfills on a dev
// machine); CI runners work straight from the uploaded-keys manifest instead.
const MIRROR_DIR = path.join(ROOT, '.media-mirror')
const UPLOADED_MANIFEST_KEY = 'state/uploaded.json'
const SNAPSHOT_KEY = 'data/mlsgrid-demo.json'

type RemoteMedia = {
  projectUrl: string
  serviceKey: string
  bucket: string
  publicBase: string // …/storage/v1/object/public/<bucket>
  uploaded: Set<string> // object keys confirmed present in the bucket
  dirtySinceFlush: number
}
let remote: RemoteMedia | null = null

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

/** Follow @odata.nextLink, accumulating Property records across all pages.
 *  stopAfter > 0 stops paging once that many raw records are collected (used
 *  only for the local-iteration cap); 0 fetches every page — the demo default,
 *  required so NWMLS can review the entire feed. */
async function fetchAllPages(
  firstUrl: string,
  token: string,
  stopAfter = 0,
): Promise<ResoRecord[]> {
  const out: ResoRecord[] = []
  let url: string | undefined = firstUrl
  let page = 0
  while (url) {
    const data = await fetchJson(url, token)
    const batch = data.value ?? []
    out.push(...batch)
    page++
    console.log(`  page ${page}: +${batch.length} (total ${out.length})`)
    if (stopAfter && out.length >= stopAfter) break
    url = data['@odata.nextLink']
  }
  return out
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
async function initRemoteMedia(): Promise<void> {
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !serviceKey) return
  const bucket = process.env.SUPABASE_MEDIA_BUCKET ?? 'idx-media'
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
  remote = r
  console.log(
    `Remote media: Supabase bucket '${bucket}' ` +
      `(${r.uploaded.size} objects already replicated)`,
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
  const dir = path.join(remote ? MIRROR_DIR : LOCAL_MEDIA_DIR, id)
  const served: string[] = []
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
      const fetched = await fetchMediaBuffer(urls[i], token)
      if (!fetched) continue // already warned
      buf = await downscale(fetched)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(abs, buf)
    }

    if (remote) {
      if (!(await uploadObject(remote, key, buf, 'image/jpeg'))) continue
      remote.uploaded.add(key)
      remote.dirtySinceFlush++
      await flushUploadedManifest(remote)
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

  await initRemoteMedia()

  // ALL listing DATA is ingested by default (MAX_LISTINGS=0 → every demo listing
  // is accessible for NWMLS's field-level review, idx@nwmls.com 2026-06-15),
  // paging @odata.nextLink to the end per the documented initial-import
  // procedure (content/legal/nwmls-idx-vendor-requirements.md).
  //
  // MEDIA is the bottleneck: MLS Grid throttles to ≤2 req/s, so a full photo
  // replication (~147k photos) takes ~20h — it can only ever happen as a
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
  const MEDIA_MAX_LISTINGS = intEnv('MLSGRID_MEDIA_MAX_LISTINGS', remote ? 0 : 700)

  // MLS Grid caps $expand requests at 1000 records/page (a larger $top errors),
  // so we request 1000/page and follow @odata.nextLink until it is absent —
  // ingesting every displayable listing across all statuses in one pass.
  const EXPAND_TOP_CAP = 1000

  console.log(
    `Syncing MLS Grid feed (OriginatingSystemName='${originatingSystem}', ` +
      `data: ${MAX_LISTINGS || 'all'} listings; ` +
      `media: ${MEDIA_MAX_LISTINGS || 'all'} listings × ${MAX_PHOTOS || '∞'} photos)…`,
  )

  // Single initial-import query: all displayable listings (every status),
  // paginated to the end via @odata.nextLink. The mapper drops any records that
  // are not publicly displayable; selectDiverse() trims later only if a cap is set.
  const importFilter = `OriginatingSystemName eq '${originatingSystem}' and MlgCanView eq true`
  const importUrl = `${apiBase}/Property?$filter=${encodeURIComponent(importFilter)}&$expand=Media&$top=${EXPAND_TOP_CAP}`
  const rawRecords = await fetchAllPages(importUrl, token, MAX_LISTINGS)
  console.log(`  fetched ${rawRecords.length} raw records across all statuses`)

  // Drop duplicate listings, keeping the primary ([GUID #4]).
  const listings: ListingDetail[] = []
  let suppressed = 0
  let duplicates = 0
  for (const raw of rawRecords) {
    const ownId = deprefix(
      typeof raw.ListingId === 'string' ? raw.ListingId : undefined,
    )
    const primaryId = duplicatePrimaryId(raw)
    if (primaryId && primaryId !== ownId) {
      duplicates++
      continue
    }
    const mapped = mapResoToListing(raw)
    if (!mapped) {
      suppressed++
      continue
    }
    listings.push(mapped)
  }

  // Defensive de-dup by stable id: the feed can yield two records that map to
  // the same ListingId (re-lists, or a record modified mid-pagination), which
  // breaks React list keys and detail-page routing. Keep the first occurrence.
  const byId = new Map<string, ListingDetail>()
  for (const l of listings) if (!byId.has(l.id)) byId.set(l.id, l)
  const deduped = [...byId.values()]
  const idDupes = listings.length - deduped.length

  // Keep ALL listing data by default; a status-diverse subset only if a hard
  // MAX_LISTINGS cap is set ([no silent caps] — we log exactly what was dropped).
  const selected = MAX_LISTINGS ? selectDiverse(deduped, MAX_LISTINGS) : deduped
  const cappedListings = deduped.length - selected.length

  // Media subset: download photos for at most MEDIA_MAX_LISTINGS listings
  // (status-diverse). Listings outside it keep all their data but show NO_PHOTO.
  const skipMedia = process.env.MLSGRID_SKIP_MEDIA === 'true'
  const mediaSubset = MEDIA_MAX_LISTINGS
    ? selectDiverse(selected, MEDIA_MAX_LISTINGS)
    : selected
  const mediaIds = new Set(mediaSubset.map((l) => l.id))

  // Localize media for the subset + stamp the "data obtained as of" timestamp on
  // EVERY record. MLSGRID_SKIP_MEDIA=true skips all downloads (fast data-only
  // iteration / media-host cooldown).
  const dataAsOf = new Date().toISOString()
  let withPhotos = 0
  for (const listing of selected) {
    if (skipMedia || !mediaIds.has(listing.id)) {
      listing.images = [NO_PHOTO]
    } else {
      const urls = MAX_PHOTOS ? listing.images.slice(0, MAX_PHOTOS) : listing.images
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
  const snapshotJson = JSON.stringify(selected, null, 2) + '\n'
  await fs.writeFile(SNAPSHOT_PATH, snapshotJson, 'utf8')

  // Remote mode: publish the snapshot + manifest so Netlify builds (via
  // scripts/fetch-snapshot.ts) and future CI runs pick up exactly this state.
  if (remote) {
    await flushUploadedManifest(remote, true)
    const ok = await uploadObject(
      remote,
      SNAPSHOT_KEY,
      Buffer.from(snapshotJson),
      'application/json',
    )
    if (!ok) throw new Error('snapshot upload to Supabase failed')
    console.log(`  snapshot published to ${remote.publicBase}/${SNAPSHOT_KEY}`)
  }

  const byStatus = selected.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})
  console.log(
    `\nDone. ${selected.length} listings written to data/mlsgrid-demo.json ` +
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

main().catch((err) => {
  console.error('\nsync-idx failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
