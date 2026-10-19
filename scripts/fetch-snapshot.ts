/**
 * Fetch the published MLS Grid snapshot from Supabase Storage → data/.
 *
 *   npm run fetch:snapshot
 *
 * The scheduled sync (.github/workflows/sync-idx.yml → scripts/sync-idx.ts in
 * remote-media mode) publishes data/mlsgrid-snapshot.json to the public media
 * bucket. Netlify builds download that one file instead of re-replicating the
 * feed, so builds are fast and always consistent with the media actually in
 * the bucket.
 *
 * Exits non-zero when the snapshot isn't available (no SUPABASE_URL, or no
 * sync has published yet) — netlify.toml then falls back to `npm run sync:idx`.
 *
 * Env: SUPABASE_URL, SUPABASE_MEDIA_BUCKET (default idx-media). The bucket is
 * public, so no key is needed here.
 */
import { promises as fs } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import path from 'node:path'
import { loadDotEnvLocal } from './load-env'

async function main() {
  await loadDotEnvLocal()
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  if (!projectUrl) {
    throw new Error('SUPABASE_URL is not set — cannot fetch a published snapshot')
  }
  // `||` not `??`: an empty env value must fall back to the default bucket.
  const bucket = process.env.SUPABASE_MEDIA_BUCKET?.trim() || 'idx-media'
  const url = `${projectUrl}/storage/v1/object/public/${bucket}/data/mlsgrid-snapshot.json.gz`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`snapshot fetch failed ${res.status} for ${url}`)
  }
  const body = gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8')
  const listings = JSON.parse(body) as unknown[]
  if (!Array.isArray(listings) || listings.length === 0) {
    throw new Error('published snapshot is empty — refusing to build from it')
  }

  const dest = path.join(process.cwd(), 'data', 'mlsgrid-snapshot.json')
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, body, 'utf8')
  console.log(`Fetched snapshot: ${listings.length} listings → data/mlsgrid-snapshot.json`)
}

main().catch((err) => {
  console.error('fetch-snapshot failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
