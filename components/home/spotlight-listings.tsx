import { headers } from 'next/headers'
import { Container } from '@/components/site/container'
import { SpotlightCarousel } from './spotlight-carousel'
import type { ListingSummary } from '@/types/listing'

type ApiResponse = {
  items: ListingSummary[]
  total: number
  limit: number
  offset: number
}

async function getSpotlightListings(): Promise<ListingSummary[]> {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const res = await fetch(
    `${protocol}://${host}/api/listings?status=for-sale&limit=6`,
    { next: { revalidate: 300 } },
  )
  if (!res.ok) return []
  const data: ApiResponse = await res.json()
  return data.items
}

export async function SpotlightListings() {
  const items = await getSpotlightListings()
  if (items.length === 0) return null

  return (
    <section
      aria-label="Spotlight listings"
      className="py-16 md:py-20 lg:py-24"
    >
      <Container className="text-center">
        <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
          Featured Listings
        </p>
        <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
          Spotlight Listings
        </h2>

        <SpotlightCarousel items={items} />
      </Container>
    </section>
  )
}
