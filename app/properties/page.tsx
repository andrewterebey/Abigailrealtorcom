import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Container } from '@/components/site/container'
import { ListingGrid } from '@/components/listings/listing-grid'
import type { ListingSummary } from '@/types/listing'

export const metadata: Metadata = {
  title: 'Properties',
  description:
    'Browse active, pending, and recently sold listings represented by Abigail Anderson across Bellevue, Seattle, Kirkland, Newcastle, Shoreline, and Renton.',
  alternates: { canonical: '/properties' },
  openGraph: {
    title: 'Properties | Abigail Anderson',
    description:
      'Active, pending, and recently sold listings across King County, Washington.',
    url: '/properties',
    type: 'website',
  },
}

type ApiResponse = {
  items: ListingSummary[]
  total: number
  limit: number
  offset: number
}

async function fetchListings(params: URLSearchParams): Promise<ApiResponse> {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const qs = params.toString()
  const res = await fetch(
    `${protocol}://${host}/api/listings${qs ? `?${qs}` : ''}`,
    { next: { revalidate: 60 } },
  )
  if (!res.ok) {
    return { items: [], total: 0, limit: 20, offset: 0 }
  }
  return res.json()
}

export default async function PropertiesPage() {
  // Live splits into two sections: FEATURED PROPERTIES (single highlighted
  // for-sale listing) and SOLD PROPERTIES (full grid). Fetch both in parallel.
  const forSaleParams = new URLSearchParams({ status: 'for-sale', limit: '1' })
  const soldParams = new URLSearchParams({ status: 'sold', limit: '20' })
  const [forSale, sold] = await Promise.all([
    fetchListings(forSaleParams),
    fetchListings(soldParams),
  ])

  return (
    <main>
      <section
        aria-label="Properties"
        className="relative overflow-hidden text-white"
      >
        <Image
          src="/images/properties-background.jpg"
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <Container className="relative z-10 flex flex-col items-center py-32 text-center md:py-40 lg:py-48">
          <h1 className="text-[44px] leading-[1.1] text-white md:text-[60px] lg:text-[70px]">
            Properties
          </h1>
        </Container>
      </section>

      <section
        aria-label="Featured properties"
        className="py-16 md:py-20 lg:py-24"
      >
        <Container>
          <div className="mb-10 text-center">
            <h2 className="text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              Featured Properties
            </h2>
          </div>
          {/* Featured = single highlighted listing on live; render in a centered
              single-column lane so the card doesn't get stretched across 3 columns. */}
          <div className="mx-auto max-w-md">
            <ListingGrid
              items={forSale.items}
              className="!grid-cols-1 sm:!grid-cols-1 lg:!grid-cols-1"
              emptyMessage="No featured properties at the moment."
            />
          </div>
        </Container>
      </section>

      <section
        aria-label="Sold properties"
        className="pb-16 md:pb-20 lg:pb-24"
      >
        <Container>
          <div className="mb-10 text-center">
            <h2 className="text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              Sold Properties
            </h2>
          </div>
          <ListingGrid
            items={sold.items}
            className="sm:grid-cols-2 lg:grid-cols-2"
            emptyMessage="No sold properties to show yet."
          />

          <p className="mx-auto mt-16 max-w-4xl text-center font-body text-[13px] leading-[1.7] text-site-text-muted">
            The IDX display contains information sourced from the Northwest
            Multiple Listing Service. This data is intended solely for personal,
            non-commercial use and is not to be utilized for any other purpose
            except to identify potential properties for purchase. Although the
            MLS data displayed is typically considered reliable, it is not
            guaranteed to be accurate by the MLS. Buyers are responsible for
            verifying the accuracy of all information and are advised to conduct
            their own investigations or seek professional assistance.
          </p>
        </Container>
      </section>

      {/* Dark band CTA linking to the IDX search, matching live. */}
      <section
        aria-label="Start your property search"
        className="bg-black text-white"
      >
        <Container className="flex flex-col items-center justify-between gap-6 py-10 text-center md:flex-row md:text-left">
          <h2 className="text-[24px] leading-[1.2] text-white md:text-[30px]">
            Start Your Property Search
          </h2>
          <Link
            href="/home-search/listings"
            className="inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
          >
            Learn More
          </Link>
        </Container>
      </section>
    </main>
  )
}
