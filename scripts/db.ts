/**
 * Supabase Postgres replication helper for the IDX pipeline (CLAUDE.md §7.7
 * Phase B). The `listings` table stores each mapped ListingDetail as jsonb
 * (`record`) with GENERATED search columns (see the create_listings migration),
 * so the only things a writer supplies are id, record, and the sync stamp.
 *
 * Writes go through PostgREST with the service-role key — plain fetch, no SDK
 * dependency, mirroring the storage uploader in sync-idx.ts.
 */
import type { ListingDetail } from '../types/listing'

const BATCH_SIZE = 500

function dbEnv(): { restUrl: string; serviceKey: string } | null {
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!projectUrl || !serviceKey) return null
  return { restUrl: `${projectUrl}/rest/v1`, serviceKey }
}

/** Upsert the full listing set; when `reconcile` is true, rows absent from
 *  this set (synced_at older than this run) are deleted afterwards — that is
 *  how MlgCanView revocations propagate to the DB. Only reconcile when
 *  `listings` is a COMPLETE feed snapshot, never a capped subset. */
export async function upsertListingsToDb(
  listings: ListingDetail[],
  opts: { reconcile: boolean },
): Promise<void> {
  const env = dbEnv()
  if (!env) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set')
  const syncedAt = new Date().toISOString()
  const headers = {
    Authorization: `Bearer ${env.serviceKey}`,
    apikey: env.serviceKey,
    'Content-Type': 'application/json',
  }

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE).map((record) => ({
      id: record.id,
      record,
      synced_at: syncedAt,
    }))
    const res = await fetch(`${env.restUrl}/listings?on_conflict=id`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    })
    if (!res.ok) {
      throw new Error(
        `listings upsert batch ${i / BATCH_SIZE + 1} failed ${res.status}: ${await res.text()}`,
      )
    }
  }
  console.log(`  DB: upserted ${listings.length} listings`)

  if (opts.reconcile) {
    const res = await fetch(
      `${env.restUrl}/listings?synced_at=lt.${encodeURIComponent(syncedAt)}`,
      { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } },
    )
    if (!res.ok) {
      throw new Error(`listings reconcile delete failed ${res.status}: ${await res.text()}`)
    }
    console.log('  DB: reconciled (rows no longer in the feed deleted)')
  }
}
