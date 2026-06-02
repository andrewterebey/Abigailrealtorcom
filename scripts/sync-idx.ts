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

  // Demo caps — the NWMLS demo feed has ~10k listings (and the feed clusters by
  // status), so we query each status separately and take a slice of each. This
  // guarantees the demo shows every status type and keeps media volume small.
  // Set a cap to 0 for unlimited. The PRODUCTION feed would drop these caps and
  // use a DB-backed sync (see CLAUDE.md §7.7).
  const MAX_LISTINGS = intEnv('MLSGRID_MAX_LISTINGS', 75)
  const MAX_PHOTOS = intEnv('MLSGRID_MAX_PHOTOS', 6)

  // StandardStatus values to pull, one slice each, for status variety.
  const STATUS_QUERIES = [
    "StandardStatus eq 'Active'",
    "StandardStatus eq 'Active Under Contract'",
    "StandardStatus eq 'Pending'",
    "StandardStatus eq 'Closed'",
  ]
  // MLS Grid caps $expand requests at 1000 records/request — a larger $top
  // errors out. We also read only the first page per status here (no
  // @odata.nextLink follow), which is fine for a capped demo; the production
  // path is a DB-backed sync that pages via nextLink (see CLAUDE.md §7.7).
  const EXPAND_TOP_CAP = 1000
  const requestedPerStatus = MAX_LISTINGS
    ? Math.ceil(MAX_LISTINGS / STATUS_QUERIES.length)
    : EXPAND_TOP_CAP
  const perStatus = Math.min(requestedPerStatus, EXPAND_TOP_CAP)
  if (requestedPerStatus > EXPAND_TOP_CAP) {
    console.warn(
      `  ⚠ requested ~${requestedPerStatus}/status exceeds the ${EXPAND_TOP_CAP}-record ` +
        `$expand cap; capping at ${EXPAND_TOP_CAP}. For larger pulls add @odata.nextLink paging.`,
    )
  }

  console.log(
    `Syncing MLS Grid feed (OriginatingSystemName='${originatingSystem}', ` +
      `~${perStatus}/status, max ${MAX_LISTINGS || '∞'} listings × ${MAX_PHOTOS || '∞'} photos)…`,
  )

  const rawRecords: ResoRecord[] = []
  for (const statusClause of STATUS_QUERIES) {
    const filter = `OriginatingSystemName eq '${originatingSystem}' and MlgCanView eq true and ${statusClause}`
    const url = `${apiBase}/Property?$filter=${encodeURIComponent(filter)}&$expand=Media&$top=${perStatus}`
    const data = await fetchJson(url, token)
    const batch = data.value ?? []
    rawRecords.push(...batch)
    console.log(`  ${statusClause}: ${batch.length} records`)
  }

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

  // Keep a status-diverse subset so the demo shows every status type ([no
  // silent caps] — we log exactly what was dropped).
  const selected = MAX_LISTINGS ? selectDiverse(listings, MAX_LISTINGS) : listings
  const cappedListings = listings.length - selected.length

  // Localize media (capped) + stamp the "data obtained as of" timestamp.
  // MLSGRID_SKIP_MEDIA=true writes the snapshot without downloading photos
  // (useful while the media host is in a rate-limit cooldown, or for fast
  // data-only iteration). Photos fall back to the NO_PHOTO placeholder.
  const skipMedia = process.env.MLSGRID_SKIP_MEDIA === 'true'
  const dataAsOf = new Date().toISOString()
  for (const listing of selected) {
    if (skipMedia) {
      listing.images = [NO_PHOTO]
    } else {
      const urls = MAX_PHOTOS ? listing.images.slice(0, MAX_PHOTOS) : listing.images
      const localImages = await downloadMedia(listing.id, urls, token)
      listing.images = localImages.length ? localImages : [NO_PHOTO]
    }
    listing.primaryImage = listing.images[0]
    listing.dataAsOf = dataAsOf
  }
  if (skipMedia) console.log('  (MLSGRID_SKIP_MEDIA=true — photos not downloaded)')

  await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true })
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(selected, null, 2) + '\n', 'utf8')

  const byStatus = selected.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})
  console.log(
    `\nDone. ${selected.length} listings written to data/mlsgrid-demo.json ` +
      `(${suppressed} suppressed, ${duplicates} duplicates dropped, ` +
      `${cappedListings} over the ${MAX_LISTINGS}-listing demo cap).`,
  )
  console.log(`  by status: ${JSON.stringify(byStatus)}`)
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
