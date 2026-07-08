/**
 * Coarse listing status used for filtering, search bucketing, and badge color.
 *
 * NWMLS exposes many fine-grained statuses (Pending Inspection, Pending
 * Feasibility, Pending BU Requested, Pending Short Sale, …). We bucket those
 * into this coarse union for search/filtering and carry the exact display text
 * in `ListingSummary.statusLabel` (NWMLS requires the precise wording, e.g.
 * "Pending – Backup Offer Requested" — see content/legal/nwmls-idx-vendor-requirements.md).
 *
 * `contingent` is its own bucket because NWMLS requires Contingent listings to
 * appear in *Active* (`for-sale`) searches while still being visually distinct.
 */
export type ListingStatus = 'for-sale' | 'contingent' | 'pending' | 'sold'

export type PropertyType =
  | 'single-family'
  | 'condo'
  | 'townhouse'
  | 'multi-family'
  | 'land'

/** Default display label per coarse status. A listing's own `statusLabel`
 *  (the exact NWMLS wording) takes precedence over this when present. */
export const STATUS_LABELS: Record<ListingStatus, string> = {
  'for-sale': 'For Sale',
  contingent: 'Contingent',
  pending: 'Pending',
  sold: 'Sold',
}

/** Statuses considered "Active" for search. NWMLS requires Contingent listings
 *  to be returned by Active (`for-sale`) searches since they are still for sale. */
export const ACTIVE_STATUSES: readonly ListingStatus[] = ['for-sale', 'contingent']

export interface ListingFilter {
  city?: string
  /** 5-digit ZIP; matches on the first 5 digits of the listing's zip. */
  zip?: string
  minPrice?: number
  maxPrice?: number
  minBeds?: number
  minBaths?: number
  propertyType?: PropertyType
  status?: ListingStatus
}

export interface Pagination {
  limit: number
  offset: number
}

export interface ListingSummary {
  id: string
  mlsNumber: string
  slug: string
  address: string
  city: string
  state: string
  zip: string
  price: number
  beds: number
  baths: number
  sqft: number
  status: ListingStatus
  primaryImage: string
  /** Lat/lng for the search-results map. Real IDX feeds include this on
   *  summary rows; we promote it from detail so the map view doesn't need
   *  N+1 detail fetches just to plot pins. */
  coordinates: { lat: number; lng: number }

  // ── NWMLS/MLS Grid compliance fields ──────────────────────────────────────
  // Populated only from the real (demo or production) NWMLS feed; absent on
  // fabricated placeholder data. The UI renders NWMLS attribution only when
  // these are present / branded mode is on, so fake data never wears NWMLS
  // branding (see content/legal/nwmls-idx-vendor-requirements.md §7).
  /** Exact NWMLS status wording, e.g. "Pending – Backup Offer Requested". */
  statusLabel?: string
  /** Listing brokerage name — must be displayed adjacent to the photo. */
  brokerageName?: string
  /** Cooperating (buyer) brokerage — required adjacent to listing brokerage on
   *  Sold listings. */
  coBrokerageName?: string
  /** Cumulative Days on Market (NWMLS CDOM). */
  cdom?: number
  /** Whether the listing may be pinned on a map. From `NWM_ShowMapLink`; when
   *  false the listing still appears in result lists but not on the map.
   *  Treated as true when undefined. */
  showOnMap?: boolean
  /** ISO timestamp the feed data was obtained (drives the "Based on information
   *  submitted to the MLS GRID as of …" disclaimer). */
  dataAsOf?: string
}

export interface ListingDetail extends ListingSummary {
  description: string
  images: string[]
  /** Optional — land and some new-construction listings have no year built. */
  yearBuilt?: number
  propertyType: PropertyType
  features: string[]
  schoolDistrict?: string
  listingAgent?: string
}
