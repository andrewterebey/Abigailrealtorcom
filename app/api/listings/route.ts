import { NextResponse } from 'next/server'
import { provider } from '@/lib/idx'
import {
  listQuerySchema,
  listingListResponseSchema,
} from '@/lib/schemas'

const DEFAULT_LIMIT = 20

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
  const limit = q.limit ?? DEFAULT_LIMIT
  const offset = q.offset ?? 0

  const { items, total } = await provider.list(
    {
      city: q.city,
      minPrice: q.min_price,
      maxPrice: q.max_price,
      minBeds: q.min_beds,
      minBaths: q.min_baths,
      propertyType: q.property_type,
      status: q.status,
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
