import { ACTIVE_STATUSES, normalizeBrokerageName } from '@/types/listing'
import type {
  IDXProvider,
  ListingDetail,
  ListingFilter,
  Pagination,
} from './provider'
import { toSummary } from './mlsgrid-provider'

/**
 * Serves the licensed NWMLS feed from the Supabase Postgres mirror that
 * scripts/sync-idx.ts maintains (table `public.listings`: `record` jsonb plus
 * GENERATED search columns that mirror lib/idx/filter.ts semantics). This is
 * the production store — the full on-market feed plus a year of sold listings
 * is far too large for the bundled snapshot file MLSGridProvider reads.
 *
 * Reads go through PostgREST with the publishable (anon) key; RLS grants
 * public SELECT only. Results are cached for a few minutes — the feed itself
 * refreshes twice a day ([GRID §11]).
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY (server-only; not NEXT_PUBLIC_).
 */
const REVALIDATE_SECONDS = 300
const TABLE = 'listings'

function env(): { rest: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  return { rest: `${url}/rest/v1`, key }
}

export function supabaseProviderConfigured(): boolean {
  return env() !== null
}

async function rest(query: string, prefer?: string): Promise<Response> {
  const e = env()
  if (!e) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY not set')
  const res = await fetch(`${e.rest}/${TABLE}?${query}`, {
    headers: {
      apikey: e.key,
      Authorization: `Bearer ${e.key}`,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    next: { revalidate: REVALIDATE_SECONDS },
  })
  if (!res.ok) {
    throw new Error(`listings query failed ${res.status}: ${await res.text()}`)
  }
  return res
}

/** Translate the shared ListingFilter onto the table's generated columns.
 *  Keep in step with lib/idx/filter.ts — same semantics, different engine. */
function filterParams(f: ListingFilter): URLSearchParams {
  const p = new URLSearchParams()
  if (f.city) p.append('city_lower', `eq.${f.city.toLowerCase()}`)
  if (f.zip) p.append('zip5', `eq.${f.zip}`)
  if (f.minPrice !== undefined) p.append('price', `gte.${f.minPrice}`)
  if (f.maxPrice !== undefined) p.append('price', `lte.${f.maxPrice}`)
  if (f.minBeds !== undefined) p.append('beds', `gte.${f.minBeds}`)
  if (f.minBaths !== undefined) p.append('baths', `gte.${f.minBaths}`)
  if (f.propertyType) p.append('property_type', `eq.${f.propertyType}`)
  if (f.brokerage) {
    p.append('brokerage_key', `eq.${normalizeBrokerageName(f.brokerage)}`)
  }
  if (f.status) {
    // Active search includes Contingent ([GUID #5]; idx@nwmls.com 2026-07-13).
    if (f.status === 'for-sale') {
      p.append('status', `in.(${ACTIVE_STATUSES.join(',')})`)
    } else {
      p.append('status', `eq.${f.status}`)
    }
  }
  return p
}

function totalFromContentRange(header: string | null): number | null {
  // "0-19/147" or "*/0"
  const m = header?.match(/\/(\d+)$/)
  return m ? Number(m[1]) : null
}

// Listing ids are MLS numbers and slugs are [a-z0-9-], so they are safe to
// embed in a PostgREST `or=(…)` expression; anything else is rejected.
const SAFE_KEY = /^[a-z0-9-]+$/i

export class SupabaseProvider implements IDXProvider {
  async list(filter: ListingFilter, page: Pagination) {
    const p = filterParams(filter)
    p.set('select', 'record')
    p.set('order', 'has_photo.desc,price.desc,id.asc')
    p.set('limit', String(page.limit))
    p.set('offset', String(page.offset))
    const res = await rest(p.toString(), 'count=exact')
    const rows = (await res.json()) as { record: ListingDetail }[]
    const total =
      totalFromContentRange(res.headers.get('content-range')) ??
      page.offset + rows.length
    return { items: rows.map((r) => toSummary(r.record)), total }
  }

  async get(id: string): Promise<ListingDetail | null> {
    if (!SAFE_KEY.test(id)) return null
    const p = new URLSearchParams({
      select: 'record',
      or: `(id.eq.${id},slug.eq.${id})`,
      limit: '1',
    })
    const res = await rest(p.toString())
    const rows = (await res.json()) as { record: ListingDetail }[]
    return rows[0]?.record ?? null
  }
}

/** "Data obtained as of" stamp of the most recent sync ([GRID §24]). */
export async function getDbDataAsOf(): Promise<string | undefined> {
  const p = new URLSearchParams({
    select: 'dataAsOf:record->>dataAsOf',
    order: 'synced_at.desc',
    limit: '1',
  })
  try {
    const res = await rest(p.toString())
    const rows = (await res.json()) as { dataAsOf?: string }[]
    return rows[0]?.dataAsOf ?? undefined
  } catch (err) {
    console.warn(`[supabase-provider] dataAsOf lookup failed: ${(err as Error).message}`)
    return undefined
  }
}
