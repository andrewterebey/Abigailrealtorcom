import { NextResponse } from 'next/server'
import { provider } from '@/lib/idx'
import type { MapBounds } from '@/types/listing'
import {
  listQuerySchema,
  listingListResponseSchema,
} from '@/lib/schemas'

const DEFAULT_LIMIT = 20

/** "south,west,north,east" → MapBounds, or null when the box is not a valid
 *  lat/lng rectangle (the schema only checks the shape). */
function parseBounds(raw: string): MapBounds | null {
  const [south, west, north, east] = raw.split(',').map(Number)
  const latOk = (v: number) => v >= -90 && v <= 90
  const lngOk = (v: number) => v >= -180 && v <= 180
  if (!latOk(south) || !latOk(north) || !lngOk(west) || !lngOk(east)) return null
  if (south >= north || west >= east) return null
  return { south, west, north, east }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const raw = Object.fromEntries(url.searchParams.entries())

  const parsed = listQuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const q = parsed.data
  const bounds = q.bounds ? parseBounds(q.bounds) : undefined
  if (bounds === null) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        issues: [{ path: ['bounds'], message: 'not a valid lat/lng box' }],
      },
      { status: 400 },
    )
  }
  const limit = q.limit ?? DEFAULT_LIMIT
  const offset = q.offset ?? 0

  const { items, total } = await provider.list(
    {
      city: q.city,
      zip: q.zip,
      minPrice: q.min_price,
      maxPrice: q.max_price,
      minBeds: q.min_beds,
      minBaths: q.min_baths,
      propertyType: q.property_type,
      status: q.status,
      brokerage: q.brokerage,
      bounds,
    },
    { limit, offset },
  )

  const payload = { items, total, limit, offset }
  const validated = listingListResponseSchema.safeParse(payload)
  if (!validated.success) {
    console.error(
      '[api/listings] provider returned data violating contract',
      validated.error.issues,
    )
    return NextResponse.json(
      { error: 'Provider contract violation' },
      { status: 500 },
    )
  }

  return NextResponse.json(validated.data)
}
