import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Container } from '@/components/site/container'
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

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents)
}

export async function SpotlightListings() {
  const items = await getSpotlightListings()
  if (items.length === 0) return null
  const featured = items[0]

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

        <div className="mt-12">
          <Link
            href={`/properties/${featured.slug}`}
            className="group mx-auto block max-w-3xl overflow-hidden text-left"
          >
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src={featured.primaryImage}
                alt={featured.address}
                fill
                sizes="(min-width: 1024px) 768px, 100vw"
                className="object-cover transition-transform duration-[700ms] group-hover:scale-[1.02]"
              />
              <span className="absolute right-4 top-4 bg-site-gold px-4 py-1.5 font-body text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                {featured.status === 'for-sale' ? 'For Sale' : featured.status}
              </span>
            </div>
          </Link>

          <div className="mt-6 text-center">
            <h3 className="text-[24px] leading-[1.3]">{featured.address}</h3>
            <p className="mt-1 font-body text-[13px] uppercase tracking-[0.14em] text-site-text">
              {featured.address}, {featured.city}, {featured.state} {featured.zip}
            </p>
            <p className="mt-2 font-body text-[12px] uppercase tracking-[0.14em] text-site-text-muted">
              {featured.beds} BD | {featured.baths} BA | {featured.sqft.toLocaleString()} sqft
            </p>
            <p className="mt-3 font-body text-[18px] font-semibold text-site-text">
              {formatPrice(featured.price)}
            </p>
          </div>
        </div>

        <Link
          href="/properties"
          className="mt-10 inline-flex items-center justify-center bg-site-gold px-10 py-[18px] font-body text-[14px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-site-gold-dim"
        >
          View All
        </Link>
      </Container>
    </section>
  )
}
