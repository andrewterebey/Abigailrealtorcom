export type ListingStatus = 'for-sale' | 'pending' | 'sold'

export type PropertyType =
  | 'single-family'
  | 'condo'
  | 'townhouse'
  | 'multi-family'
  | 'land'

export interface ListingFilter {
  city?: string
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
}

export interface ListingDetail extends ListingSummary {
  description: string
  images: string[]
  yearBuilt: number
  propertyType: PropertyType
  features: string[]
  schoolDistrict?: string
  listingAgent?: string
}
