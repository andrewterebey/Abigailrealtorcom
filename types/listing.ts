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

/** The member firm this site is licensed to (data license request: Brokerage
 *  "John L. Scott, Inc.", DB J. Lennox Scott). NWMLS allows a member site to
 *  *feature* (spotlight) only its own brokerage's listings (idx@nwmls.com
 *  review, 2026-07-13) — the homepage spotlight filters on this name. */
export const OWN_BROKERAGE_NAME = 'John L. Scott, Inc.'

/** Loose-normalizes a brokerage name for comparison ("John L. Scott, Inc." ≡
 *  "John L. Scott, Inc" — the feed's punctuation varies per office record).
 *  Deliberately an EXACT normalized match, not a prefix match: franchise
 *  offices like "John L. Scott Everett" are separate member firms and must
 *  not match the licensed firm. */
export function normalizeBrokerageName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface ListingFilter {
  city?: string
  /** 5-digit ZIP; matches on the first 5 digits of the listing's zip. */
  zip?: string
  minPrice?: number
  maxPrice?: number
  minBeds?: number
  minBaths?: number
  propertyType?: PropertyType
  /** `for-sale` means "Active" and also matches `contingent` (NWMLS rule);
   *  every other value matches exactly. */
  status?: ListingStatus
  /** Restrict to one member firm (punctuation/case-insensitive exact match on
   *  `brokerageName`). Listings without a brokerageName never match. */
  brokerage?: string
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
  /** Cumulative Days on Market as stored in the feed. NOT display-ready on
   *  its own — the feed value stops accruing between originating-system
   *  updates. Render via displayCdom() (lib/cdom.ts), which applies the
   *  NWMLS-prescribed formula (idx@nwmls.com, 2026-08-11). */
  cdom?: number
  /** OriginatingSystemModificationTimestamp — when the feed's cdom value was
   *  last current. Input to displayCdom(). */
  cdomAsOf?: string
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
