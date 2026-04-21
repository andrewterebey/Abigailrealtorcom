import type {
  ListingDetail,
  ListingFilter,
  ListingSummary,
  Pagination,
} from '@/types/listing'

export type {
  ListingStatus,
  PropertyType,
  ListingFilter,
  Pagination,
  ListingSummary,
  ListingDetail,
} from '@/types/listing'

export interface IDXProvider {
  list(
    filter: ListingFilter,
    page: Pagination,
  ): Promise<{ items: ListingSummary[]; total: number }>
  get(id: string): Promise<ListingDetail | null>
}
