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
}

export interface ListingDetail extends ListingSummary {
  description: string
  images: string[]
  coordinates: { lat: number; lng: number }
  yearBuilt: number
  propertyType: PropertyType
  features: string[]
  schoolDistrict?: string
  listingAgent?: string
}
