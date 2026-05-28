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

type ODataPage = { value?: ResoRecord[]; '@odata.nextLink'?: string }

async function fetchJson(url: string, token: string): Promise<ODataPage> {
  for (let attempt = 1; attempt <= 4; attempt++) {
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

function extFromUrl(url: string): string {
  const clean = url.split('?')[0]
  const ext = path.extname(clean).toLowerCase()
  return /^\.(jpe?g|png|webp|gif)$/.test(ext) ? ext : '.jpg'
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
    const ext = extFromUrl(urls[i])
    const file = `${String(i).padStart(2, '0')}${ext}`
    const abs = path.join(dir, file)
    const publicPath = `/idx/${id}/${file}`
    try {
      await fs.access(abs)
      local.push(publicPath) // already downloaded
      continue
    } catch {
      /* not present — download below */
    }
    const res = await fetch(urls[i], {
      // MLS Grid requires the OAuth token as the user-agent for media.
      headers: { 'User-Agent': token },
    })
    if (!res.ok) {
      console.warn(`  ⚠ media ${urls[i]} → ${res.status}; skipping`)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    await fs.writeFile(abs, buf)
    local.push(publicPath)
    await sleep(250) // stay well under 2 req/s
  }
  return local
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

  const filter = `OriginatingSystemName eq '${originatingSystem}' and MlgCanView eq true`
  let url: string | undefined =
    `${apiBase}/Property?$filter=${encodeURIComponent(filter)}&$expand=Media&$top=1000`

  console.log(`Syncing MLS Grid feed (OriginatingSystemName='${originatingSystem}')…`)

  const rawRecords: ResoRecord[] = []
  let page = 0
  while (url) {
    page++
    const data = await fetchJson(url, token)
    const batch = data.value ?? []
    rawRecords.push(...batch)
    console.log(`  page ${page}: ${batch.length} records (total ${rawRecords.length})`)
    url = data['@odata.nextLink']
    if (url) await sleep(600) // ≤2 req/s
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

  // Localize media + stamp the "data obtained as of" timestamp.
  const dataAsOf = new Date().toISOString()
  for (const listing of listings) {
    const localImages = await downloadMedia(listing.id, listing.images, token)
    listing.images = localImages.length ? localImages : [NO_PHOTO]
    listing.primaryImage = listing.images[0]
    listing.dataAsOf = dataAsOf
  }

  await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true })
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(listings, null, 2) + '\n', 'utf8')

  console.log(
    `\nDone. ${listings.length} listings written to data/mlsgrid-demo.json ` +
      `(${suppressed} suppressed, ${duplicates} duplicates dropped).`,
  )
}

main().catch((err) => {
  console.error('\nsync-idx failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
