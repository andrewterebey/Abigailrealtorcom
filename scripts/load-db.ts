/**
 * Load the current data/mlsgrid-demo.json snapshot into the Supabase
 * `listings` table (upsert + reconcile).
 *
 *   npm run db:load
 *
 * Normally the DB stays fresh via sync-idx.ts (which upserts after every
 * remote-mode run); this standalone loader exists for the initial fill and
 * manual re-loads. It reconciles: DB rows not present in the snapshot are
 * deleted, so only run it with a FULL snapshot on disk.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { loadDotEnvLocal } from './load-env'
import { upsertListingsToDb } from './db'
import type { ListingDetail } from '../types/listing'

async function main() {
  await loadDotEnvLocal()
  const snapshotPath = path.join(process.cwd(), 'data', 'mlsgrid-demo.json')
  const listings = JSON.parse(
    await fs.readFile(snapshotPath, 'utf8'),
  ) as ListingDetail[]
  if (!Array.isArray(listings) || listings.length === 0) {
    throw new Error('snapshot is empty — refusing to load (and reconcile) from it')
  }
  console.log(`Loading ${listings.length} listings into Supabase…`)
  await upsertListingsToDb(listings, { reconcile: true })
  console.log('Done.')
}

main().catch((err) => {
  console.error('load-db failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
