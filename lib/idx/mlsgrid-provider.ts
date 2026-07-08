import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ACTIVE_STATUSES } from '@/types/listing'
import type {
  IDXProvider,
  ListingDetail,
  ListingFilter,
  ListingSummary,
  Pagination,
} from './provider'

/**
 * Reads the snapshot produced by `npm run sync:idx` (scripts/sync-idx.ts) from
 * the MLS Grid feed and serves it through the IDXProvider contract. The
 * snapshot is already NWMLS-suppressed and media-localized by the sync, so this
 * provider just filters + paginates — same role PlaceholderProvider plays for
 * fabricated data, but this data IS genuine licensed NWMLS data.
 *
 * Production note: when the dataset grows past a static snapshot (full
 * county-wide IDX search), swap the file read for a DB query — the IDXProvider
 * surface stays identical (see content/legal/nwmls-idx-vendor-requirements.md).
 */
const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'mlsgrid-demo.json')

let cache: ListingDetail[] | null = null

async function loadAll(): Promise<ListingDetail[]> {
  if (cache) return cache
  try {
    const raw = await fs.readFile(SNAPSHOT_PATH, 'utf8')
    cache = JSON.parse(raw) as ListingDetail[]
  } catch (err) {
    // Snapshot not generated yet (e.g. sync hasn't run on this deploy).
    // Serve empty rather than crash so the rest of the site renders.
    console.warn(
      `[mlsgrid-provider] snapshot not found at ${SNAPSHOT_PATH}; run "npm run sync:idx". (${(err as Error).message})`,
    )
    cache = []
  }
  return cache
}

/**
 * The "data obtained as of" timestamp the sync (scripts/sync-idx.ts) stamps on
 * every snapshot record. Drives the MLS Grid IDX Rule §24 disclaimer — which
 * must reflect the date/time the MLS GRID Data was *obtained*, not page-render
 * time. Returns undefined when no snapshot exists (placeholder mode / unsynced).
 */
export async function getSnapshotDataAsOf(): Promise<string | undefined> {
  const all = await loadAll()
  return all[0]?.dataAsOf
}

function matches(listing: ListingDetail, f: ListingFilter): boolean {
  if (f.city && listing.city.toLowerCase() !== f.city.toLowerCase()) return false
  if (f.zip && listing.zip.slice(0, 5) !== f.zip) return false
  if (f.minPrice !== undefined && listing.price < f.minPrice) return false
  if (f.maxPrice !== undefined && listing.price > f.maxPrice) return false
  if (f.minBeds !== undefined && listing.beds < f.minBeds) return false
  if (f.minBaths !== undefined && listing.baths < f.minBaths) return false
  if (f.propertyType && listing.propertyType !== f.propertyType) return false
  if (f.status) {
    // NWMLS rule: an Active (for-sale) search must also return Contingent
    // listings, since they are still for sale ([GUID #5]).
    if (f.status === 'for-sale') {
      if (!ACTIVE_STATUSES.includes(listing.status)) return false
    } else if (listing.status !== f.status) {
      return false
    }
  }
  return true
}

function toSummary(d: ListingDetail): ListingSummary {
  return {
    id: d.id,
    mlsNumber: d.mlsNumber,
    slug: d.slug,
    address: d.address,
    city: d.city,
    state: d.state,
    zip: d.zip,
    price: d.price,
    beds: d.beds,
    baths: d.baths,
    sqft: d.sqft,
    status: d.status,
    primaryImage: d.primaryImage,
    coordinates: d.coordinates,
    // Carry the compliance fields onto summaries so cards/map can render the
    // required NWMLS attribution without an N+1 detail fetch.
    statusLabel: d.statusLabel,
    brokerageName: d.brokerageName,
    coBrokerageName: d.coBrokerageName,
    cdom: d.cdom,
    showOnMap: d.showOnMap,
    dataAsOf: d.dataAsOf,
  }
}

export class MLSGridProvider implements IDXProvider {
  async list(filter: ListingFilter, page: Pagination) {
    const all = await loadAll()
    const filtered = all.filter((l) => matches(l, filter))
    const items = filtered
      .slice(page.offset, page.offset + page.limit)
      .map(toSummary)
    return { items, total: filtered.length }
  }

  async get(id: string): Promise<ListingDetail | null> {
    const all = await loadAll()
    return all.find((l) => l.id === id || l.slug === id) ?? null
  }
}
