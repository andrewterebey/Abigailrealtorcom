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

// ── minimal .env.local loader (no dependency) ─────────────────────────────────
async function loadDotEnvLocal(): Promise<void> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (!m) continue
      const key = m[1]
      let val = m[2].trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  } catch {
    // no .env.local — rely on the ambient environment (e.g. Netlify)
  }
}

const ROOT = process.cwd()
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'mlsgrid-demo.json')
const MEDIA_DIR = path.join(ROOT, 'public', 'idx')

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

/** Download one listing's photos into public/idx/<id>/ and return local paths.
 *  Media is immutable, so skip files that already exist ([Best Practices]). */
async function downloadMedia(
  id: string,
  urls: string[],
  token: string,
): Promise<string[]> {
  if (urls.length === 0) return []
  const dir = path.join(MEDIA_DIR, id)
  await fs.mkdir(dir, { recursive: true })
  const local: string[] = []
  for (let i = 0; i < urls.length; i++) {
    // Re-encoded to jpeg on download, so the extension is always .jpg.
    const file = `${String(i).padStart(2, '0')}.jpg`
    const abs = path.join(dir, file)
    const publicPath = `/idx/${id}/${file}`
    try {
      await fs.access(abs)
      local.push(publicPath) // already downloaded
      continue
    } catch {
      /* not present — download below */
    }
    // Reuse-only mode: don't fetch missing media (e.g. during a media-host
    // rate-limit cooldown). Listings without cached photos fall back to NO_PHOTO.
    if (process.env.MLSGRID_NO_FETCH === 'true') continue
    const buf = await fetchMediaBuffer(urls[i], token)
    if (!buf) continue // already warned
    await fs.writeFile(abs, await downscale(buf))
    local.push(publicPath)
  }
  return local
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
  }
  console.warn(`  ⚠ media still rate-limited after retries; skipping`)
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

  // ALL listing DATA is ingested by default (MAX_LISTINGS=0 → every demo listing
  // is accessible for NWMLS's field-level review, idx@nwmls.com 2026-06-15),
  // paging @odata.nextLink to the end per the documented initial-import
  // procedure (content/legal/nwmls-idx-vendor-requirements.md).
  //
  // MEDIA is the bottleneck: MLS Grid throttles to ≤2 req/s, so fetching photos
  // for all ~13k listings would blow the Netlify build window. We download photos
  // for only MLSGRID_MEDIA_MAX_LISTINGS listings (status-diverse; 0 = all) at up
  // to MAX_PHOTOS each; the rest keep their full data and show the NO_PHOTO
  // placeholder. Raising MEDIA_MAX_LISTINGS adds ~0.7s × listings × photos to the
  // build (for broad thumbnail coverage, set MAX_PHOTOS=1 + a higher
  // MEDIA_MAX_LISTINGS). PRODUCTION needs persistent media hosting + a scheduled
  // sync (see CLAUDE.md §7.7).
  const MAX_LISTINGS = intEnv('MLSGRID_MAX_LISTINGS', 0)
  const MAX_PHOTOS = intEnv('MLSGRID_MAX_PHOTOS', 6)
  const MEDIA_MAX_LISTINGS = intEnv('MLSGRID_MEDIA_MAX_LISTINGS', 150)

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
      const localImages = await downloadMedia(listing.id, urls, token)
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
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(selected, null, 2) + '\n', 'utf8')

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
