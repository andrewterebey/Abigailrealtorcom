import { ACTIVE_STATUSES, type ListingStatus } from '@/types/listing'

const DAY_MS = 86_400_000

/**
 * Display CDOM per NWMLS's prescribed calculation (idx@nwmls.com, 2026-08-11):
 *
 *   Today's Date − OriginatingSystemModificationTimestamp
 *     + CumulativeDaysOnMarket = CDOM
 *
 * The feed's stored CumulativeDaysOnMarket only accrues while a listing is in
 * an active status and is only current as of the listing's last
 * originating-system update, so for on-market (Active/Contingent) listings the
 * days elapsed since that update are added back. Pending listings display the
 * stored value unchanged (NWMLS: "CDOM is not calculated during the time it
 * is pending"), and sold listings display the stored value as final.
 */
export function displayCdom(listing: {
  cdom?: number
  cdomAsOf?: string
  status: ListingStatus
}): number | undefined {
  const { cdom, cdomAsOf, status } = listing
  if (typeof cdom !== 'number') return undefined
  if (!ACTIVE_STATUSES.includes(status)) return cdom
  if (!cdomAsOf) return cdom
  const modifiedAt = Date.parse(cdomAsOf)
  if (Number.isNaN(modifiedAt)) return cdom
  const elapsedDays = Math.floor((Date.now() - modifiedAt) / DAY_MS)
  return elapsedDays > 0 ? cdom + elapsedDays : cdom
}
