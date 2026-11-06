import { ACTIVE_STATUSES, normalizeBrokerageName } from '@/types/listing'
import type { ListingDetail, ListingFilter, ListingSort } from '@/types/listing'

/**
 * Shared filter predicate for the snapshot-backed providers. Kept in ONE place
 * so placeholder and licensed data can never drift on search semantics — the
 * providers previously carried near-duplicate copies and the placeholder one
 * silently missed the contingent-in-Active rule below.
 */
export function matchesFilter(listing: ListingDetail, f: ListingFilter): boolean {
  if (f.city && listing.city.toLowerCase() !== f.city.toLowerCase()) return false
  if (f.zip && listing.zip.slice(0, 5) !== f.zip) return false
  if (f.minPrice !== undefined && listing.price < f.minPrice) return false
  if (f.maxPrice !== undefined && listing.price > f.maxPrice) return false
  if (f.minBeds !== undefined && listing.beds < f.minBeds) return false
  if (f.minBaths !== undefined && listing.baths < f.minBaths) return false
  if (f.propertyType && listing.propertyType !== f.propertyType) return false
  if (f.brokerage) {
    // Listings with no brokerageName (fabricated placeholder data) never match
    // a brokerage-filtered search — used by the homepage spotlight, which NWMLS
    // permits to feature ONLY the member's own brokerage (idx@nwmls.com,
    // 2026-07-13).
    if (
      !listing.brokerageName ||
      normalizeBrokerageName(listing.brokerageName) !==
        normalizeBrokerageName(f.brokerage)
    ) {
      return false
    }
  }
  if (f.bounds) {
    const { lat, lng } = listing.coordinates
    if (
      lat < f.bounds.south ||
      lat > f.bounds.north ||
      lng < f.bounds.west ||
      lng > f.bounds.east
    ) {
      return false
    }
  }
  if (f.status) {
    // NWMLS rule: an Active (for-sale) search must also return Contingent
    // listings, since they are still for sale ([GUID #5]; restated by the
    // idx@nwmls.com review of 2026-07-13).
    if (f.status === 'for-sale') {
      if (!ACTIVE_STATUSES.includes(listing.status)) return false
    } else if (listing.status !== f.status) {
      return false
    }
  }
  return true
}

/**
 * In-memory counterpart of SupabaseProvider's `order` (see
 * supabase-provider.ts). Undefined keeps the array order the snapshot was
 * written in. Ties break on id so pages are stable.
 */
export function sortListings<T extends { price: number; id: string }>(
  items: T[],
  sort: ListingSort | undefined,
): T[] {
  if (!sort) return items
  const dir = sort === 'price-asc' ? 1 : -1
  return [...items].sort(
    (a, b) => dir * (a.price - b.price) || a.id.localeCompare(b.id),
  )
}
