import Link from 'next/link'
import { headers } from 'next/headers'
import { Container } from '@/components/site/container'
import { ListingCard } from '@/components/listings/listing-card'
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
    `${protocol}://${host}/api/listings?status=for-sale&limit=3`,
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

        <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 text-left sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, idx) => (
            <ListingCard key={item.id} listing={item} priority={idx < 2} />
          ))}
        </div>

        <Link
          href="/properties"
          className="mt-14 inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
        >
          View All
        </Link>
      </Container>
    </section>
  )
}
