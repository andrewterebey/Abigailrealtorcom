import type { IDXProvider } from './provider'
import { PlaceholderProvider } from './placeholder-provider'

export const provider: IDXProvider = new PlaceholderProvider()

export type {
  IDXProvider,
  ListingDetail,
  ListingFilter,
  ListingStatus,
  ListingSummary,
  Pagination,
  PropertyType,
} from './provider'
