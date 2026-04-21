import { NextResponse } from 'next/server'
import { provider } from '@/lib/idx'
import { listingDetailSchema } from '@/lib/schemas'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!id || id.length > 200) {
    return NextResponse.json(
      { error: 'Invalid listing id' },
      { status: 400 },
    )
  }

  const listing = await provider.get(id)

  if (!listing) {
    return NextResponse.json(
      { error: 'Listing not found' },
      { status: 404 },
    )
  }

  const validated = listingDetailSchema.safeParse(listing)
  if (!validated.success) {
    console.error(
      `[api/listings/${id}] provider returned data violating contract`,
      validated.error.issues,
    )
    return NextResponse.json(
      { error: 'Provider contract violation' },
      { status: 500 },
    )
  }

  return NextResponse.json(validated.data)
}
