/**
 * Pure mapper: MLS Grid (RESO Data Dictionary) Property record → our
 * `ListingDetail`, applying NWMLS display-suppression rules at the data
 * boundary so the snapshot only ever contains publicly-displayable data.
 *
 * Rules implemented here are sourced from
 * content/legal/nwmls-idx-vendor-requirements.md (the field table) and the
 * MLS Grid API v2 docs. This function is intentionally side-effect-free (no
 * network, no clock) so it is unit-testable; the sync script stamps `dataAsOf`
 * and rewrites media paths after calling it.
 *
 * ⚠️ Field names follow the RESO Data Dictionary + NWMLS local fields, but the
 * exact shape of the MLS Grid *demo* payload must be verified against a real
 * sample (run `npm run sync:idx` and inspect data/mlsgrid-demo.json). Accessors
 * below are defensive (optional, fall back) so an unexpected shape degrades
 * gracefully rather than throwing.
 */
import type { ListingDetail, ListingStatus, PropertyType } from '@/types/listing'

/** A raw RESO Property record as returned by MLS Grid (loosely typed). */
export type ResoRecord = Record<string, unknown>

/** Placeholder shown when every photo is suppressed (see media rules below). */
export const NO_PHOTO = '/images/idx-no-photo.svg'

// ── primitive accessors ──────────────────────────────────────────────────────
function str(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim()
    return t.length ? t : undefined
  }
  if (typeof v === 'number') return String(v)
  return undefined
}
function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v)
  }
  return undefined
}
function bool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    if (/^(true|yes|y|1)$/i.test(v)) return true
    if (/^(false|no|n|0)$/i.test(v)) return false
  }
  return undefined
}

/**
 * Strip the MLS-identifying keyfield prefix MLS Grid prepends (e.g. an NWMLS
 * `ListingId` "NWM123456" → "123456"). Required before public display
 * ([prefixed-keyfield-values]). Because we serve from a synced snapshot rather
 * than re-querying MLS Grid per request, we never need to re-attach it.
 */
export function deprefix(value: string | undefined): string | undefined {
  if (!value) return undefined
  // Remove a leading run of letters (the MLS prefix); NWMLS listing numbers are numeric.
  return value.replace(/^[A-Za-z]+/, '') || value
}

function slugify(parts: Array<string | undefined>): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── status ────────────────────────────────────────────────────────────────────
// Statuses NWMLS prohibits from public display ([GRID §27 NWMLS override]).
const PROHIBITED_STANDARD = new Set([
  'expired',
  'canceled',
  'cancelled',
  'withdrawn',
  'hold',
  'delete',
  'deleted',
  'incomplete',
  'comingsoon',
  'coming soon',
])
const PROHIBITED_MLS = new Set([
  'temporarily off market',
  'sale fail',
  'sale fail release',
])

/** Returns coarse status + exact display label, or null if the listing must
 *  not be displayed at all. */
export function mapStatus(
  raw: ResoRecord,
): { status: ListingStatus; statusLabel?: string } | null {
  const standard = (str(raw.StandardStatus) ?? '').toLowerCase()
  const mls = str(raw.MlsStatus)
  const mlsLower = (mls ?? '').toLowerCase()

  if (PROHIBITED_STANDARD.has(standard) || PROHIBITED_MLS.has(mlsLower)) {
    return null
  }

  // Coarse bucket from StandardStatus, refined by MlsStatus.
  let status: ListingStatus
  if (standard === 'closed' || mlsLower === 'sold' || mlsLower === 'closed') {
    status = 'sold'
  } else if (standard === 'activeundercontract' || mlsLower.includes('contingent')) {
    status = 'contingent'
  } else if (standard === 'pending' || mlsLower.startsWith('pending')) {
    status = 'pending'
  } else if (standard === 'active') {
    status = 'for-sale'
  } else {
    // Unknown/non-displayable status — exclude to stay safe.
    return null
  }

  // NWMLS requires this exact relabel ([GUID #2]).
  let statusLabel = mls
  if (mlsLower === 'pending bu requested') {
    statusLabel = 'Pending – Backup Offer Requested'
  }

  return { status, statusLabel }
}

// ── property type ───────────────────────────────────────────────────────────
function mapPropertyType(raw: ResoRecord): PropertyType {
  const sub = (str(raw.PropertySubType) ?? str(raw.PropertyType) ?? '').toLowerCase()
  if (sub.includes('condo')) return 'condo'
  if (sub.includes('townhouse') || sub.includes('town house')) return 'townhouse'
  if (
    sub.includes('multi') ||
    sub.includes('duplex') ||
    sub.includes('triplex') ||
    sub.includes('fourplex')
  ) {
    return 'multi-family'
  }
  if (sub.includes('land') || sub.includes('lot') || sub.includes('acreage')) {
    return 'land'
  }
  return 'single-family'
}

// ── media ─────────────────────────────────────────────────────────────────────
/**
 * Ordered list of remote photo URLs to display, honoring NWMLS photo-removal
 * flags ([GUID #9/#10]). Watermarks must NOT be stripped — we pass image URLs
 * through untouched ([GUID #1]). The sync script downloads these and rewrites
 * the paths to local copies.
 */
export function mapMediaUrls(raw: ResoRecord): string[] {
  const removeAll = bool(raw.NWM_IDXMustRemovePhotosYN) === true
  const removePrimary = bool(raw.NWM_IDXMustRemovePrimaryPhotoYN) === true
  if (removeAll && removePrimary) return []

  const media = Array.isArray(raw.Media) ? (raw.Media as ResoRecord[]) : []
  const photos = media
    .filter((m) => {
      const cat = (str(m.MediaCategory) ?? 'photo').toLowerCase()
      return cat.includes('photo') || cat.includes('image') || cat === ''
    })
    .map((m) => ({
      url: str(m.MediaURL) ?? str(m.MediaUrl),
      order: num(m.Order) ?? 9999,
      preferred: bool(m.PreferredPhotoYN) === true,
    }))
    .filter((m): m is { url: string; order: number; preferred: boolean } =>
      Boolean(m.url),
    )
    .sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.order - b.order)
    .map((m) => m.url)

  // removeAll (but keep primary): only the first/preferred photo survives.
  if (removeAll) return photos.slice(0, 1)
  return photos
}

// ── features ──────────────────────────────────────────────────────────────────
/** Flatten a curated set of RESO feature fields (arrays or comma-strings) into
 *  a deduped list for the detail page. */
function collectFeatures(raw: ResoRecord): string[] {
  const fields = [
    'InteriorFeatures',
    'ExteriorFeatures',
    'Appliances',
    'Flooring',
    'ArchitecturalStyle',
    'View',
    'LotFeatures',
  ]
  const out: string[] = []
  for (const f of fields) {
    const v = raw[f]
    if (Array.isArray(v)) {
      for (const item of v) {
        const s = str(item)
        if (s) out.push(s)
      }
    } else {
      const s = str(v)
      if (s) for (const part of s.split(',')) {
        const t = part.trim()
        if (t) out.push(t)
      }
    }
  }
  return Array.from(new Set(out)).slice(0, 14)
}

// ── duplicates ──────────────────────────────────────────────────────────────
/** When present, this listing is a duplicate; the sync should keep only the
 *  primary (the listing whose id equals this value) ([GUID #4]). */
export function duplicatePrimaryId(raw: ResoRecord): string | undefined {
  return deprefix(str(raw.NWM_PrimaryListingId))
}

// ── display eligibility ───────────────────────────────────────────────────────
/**
 * Whether a record may be shown on an IDX site, per its MlgCanUse tags. MLS Grid
 * tags each record with the Use Cases it qualifies for (IDX / VOW / BO / PT); a
 * record NOT marked IDX (e.g. VOW-only or BO-only) must never appear on an IDX
 * site even when MlgCanView is true
 * (docs: api-documentation/api-version-2.0#mlgcanuse-field).
 *
 * MlgCanUse is `Collection(Edm.String)`. We fail-closed when the tag is present
 * but omits IDX. When the field is entirely absent/empty we allow the record —
 * some MLS Grid sample payloads omit it. ⚠️ Verify against a real demo snapshot
 * (`npm run sync:idx` → inspect data/mlsgrid-demo.json); if the NWMLS demo feed
 * populates MlgCanUse, tighten the absent case below to fail-closed too.
 */
function canDisplayForIdx(raw: ResoRecord): boolean {
  const v = raw.MlgCanUse
  if (!Array.isArray(v) || v.length === 0) return true // absent/empty — see note
  return v.some((u) => typeof u === 'string' && u.trim().toUpperCase() === 'IDX')
}

// ── main mapper ───────────────────────────────────────────────────────────────
export function mapResoToListing(raw: ResoRecord): ListingDetail | null {
  // Hard exclusions first.
  if (bool(raw.MlgCanView) === false) return null
  // Use-case gate: VOW-only / BO-only / PT records must never appear on the IDX
  // site, even with MlgCanView true (docs: api-version-2.0#mlgcanuse-field).
  if (!canDisplayForIdx(raw)) return null
  // Seller opt-out of ALL internet display → suppress the listing entirely. (The
  // narrower address-only opt-out, InternetAddressDisplayYN, is handled below.)
  if (bool(raw.InternetEntireListingDisplayYN) === false) return null
  const statusInfo = mapStatus(raw)
  if (!statusInfo) return null

  const id = deprefix(str(raw.ListingId)) ?? deprefix(str(raw.ListingKey))
  if (!id) return null
  const mlsNumber = deprefix(str(raw.ListingId)) ?? id

  // Address — suppressed when the seller withheld internet display ([GUID #7]).
  const addressWithheld = bool(raw.InternetAddressDisplayYN) === false
  const streetParts = [
    str(raw.StreetNumber),
    str(raw.StreetDirPrefix),
    str(raw.StreetName),
    str(raw.StreetSuffix),
    str(raw.UnitNumber),
  ]
    .filter(Boolean)
    .join(' ')
  const composedAddress =
    str(raw.UnparsedAddress) ?? (streetParts.length ? streetParts : undefined)
  const address = addressWithheld
    ? 'Address available upon request'
    : (composedAddress ?? 'Address available upon request')

  const city = str(raw.City) ?? ''
  const state = (str(raw.StateOrProvince) ?? 'WA').toUpperCase().slice(0, 2)
  const zip = str(raw.PostalCode) ?? ''

  // Map pin: use lat/long ([GUID #13]); never plot a withheld address.
  const lat = num(raw.Latitude)
  const lng = num(raw.Longitude)
  const hasCoords = lat !== undefined && lng !== undefined
  const showOnMap = !addressWithheld && bool(raw.NWM_ShowMapLink) !== false && hasCoords

  // Baths: prefer the total integer; else NWMLS full + ¾ + ½ math.
  const baths =
    num(raw.BathroomsTotalInteger) ??
    (num(raw.BathroomsFull) ?? 0) +
      (num(raw.BathroomsThreeQuarter) ?? 0) * 0.75 +
      (num(raw.BathroomsHalf) ?? 0) * 0.5

  const sqft =
    num(raw.LivingArea) ?? num(raw.AboveGradeFinishedArea) ?? num(raw.BuildingAreaTotal) ?? 0

  // Sold listings show the close price; everything else shows the list price.
  const displayPrice =
    statusInfo.status === 'sold'
      ? (num(raw.ClosePrice) ?? num(raw.ListPrice) ?? 0)
      : (num(raw.ListPrice) ?? 0)

  const slugBase = addressWithheld ? [mlsNumber] : [composedAddress, city, zip]
  const slug = slugify(slugBase) || `listing-${id}`

  return {
    id,
    mlsNumber,
    slug,
    address,
    city,
    state,
    zip,
    price: Math.max(0, Math.round(displayPrice)),
    beds: Math.max(0, Math.round(num(raw.BedroomsTotal) ?? 0)),
    baths: Math.max(0, baths),
    sqft: Math.max(0, Math.round(sqft)),
    status: statusInfo.status,
    statusLabel: statusInfo.statusLabel,
    primaryImage: NO_PHOTO, // rewritten by the sync after media download
    images: mapMediaUrls(raw), // remote URLs; rewritten to local by the sync
    coordinates: { lat: lat ?? 0, lng: lng ?? 0 },
    showOnMap,
    brokerageName: str(raw.ListOfficeName),
    // Buyer/cooperating brokerage — required adjacent to listing brokerage on
    // Sold listings ([GRID §22 NWMLS override]).
    coBrokerageName:
      statusInfo.status === 'sold'
        ? (str(raw.BuyerOfficeName) ?? str(raw.CoListOfficeName))
        : undefined,
    cdom: num(raw.CumulativeDaysOnMarket),
    description: str(raw.PublicRemarks) ?? 'Contact agent for details.',
    yearBuilt: num(raw.YearBuilt),
    propertyType: mapPropertyType(raw),
    features: collectFeatures(raw),
    schoolDistrict: str(raw.HighSchoolDistrict) ?? str(raw.ElementarySchoolDistrict),
    listingAgent: str(raw.ListAgentFullName),
    // dataAsOf is stamped by the sync (this mapper is clock-free).
  }
}
