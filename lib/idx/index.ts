import type { IDXProvider } from './provider'
import { PlaceholderProvider } from './placeholder-provider'
import { MLSGridProvider } from './mlsgrid-provider'

/**
 * Active IDX provider, selected by environment:
 *
 *   MLSGRID_TOKEN set   → MLSGridProvider  (genuine licensed NWMLS demo/prod
 *                         data; UI shows NWMLS attribution — gated separately by
 *                         NEXT_PUBLIC_IDX_NWMLS)
 *   MLSGRID_TOKEN unset → PlaceholderProvider (fabricated sample data; NWMLS
 *                         branding OFF)
 *
 * This is the legal guardrail in code: fabricated data is never served while a
 * licensed feed is configured, so placeholder listings can never wear NWMLS
 * branding (see content/legal/nwmls-idx-vendor-requirements.md §7).
 *
 * The token is only used to GENERATE the snapshot (scripts/sync-idx.ts); at
 * request time we read the committed-at-build snapshot, so its presence here is
 * just the mode switch.
 */
export const provider: IDXProvider = process.env.MLSGRID_TOKEN
  ? new MLSGridProvider()
  : new PlaceholderProvider()

export type {
  IDXProvider,
  ListingDetail,
  ListingFilter,
  ListingStatus,
  ListingSummary,
  Pagination,
  PropertyType,
} from './provider'
