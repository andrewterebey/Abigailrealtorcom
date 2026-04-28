import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Container } from '@/components/site/container'
import { ListingGrid } from '@/components/listings/listing-grid'
import type { ListingSummary } from '@/types/listing'

export const metadata: Metadata = {
  title: 'Past Transactions',
  description:
    'Recently sold listings represented by Abigail Anderson across King County, Washington.',
  alternates: { canonical: '/properties/sold' },
  openGraph: {
    title: 'Past Transactions | Abigail Anderson',
    description:
      'Recently sold listings across King County, Washington.',
    url: '/properties/sold',
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

export default async function PastTransactionsPage() {
  const soldParams = new URLSearchParams({ status: 'sold', limit: '50' })
  const sold = await fetchListings(soldParams)

  return (
    <main>
      <section
        aria-label="Past transactions"
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
            Past Transactions
          </h1>
        </Container>
      </section>

      <section
        aria-label="Sold listings"
        className="py-16 md:py-20 lg:py-24"
      >
        <Container>
          <ListingGrid
            items={sold.items}
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

      {/* Live pivots the sold-page CTA toward home valuation rather than search. */}
      <section
        aria-label="Find out your home's worth"
        className="bg-black text-white"
      >
        <Container className="flex flex-col items-center justify-between gap-6 py-10 text-center md:flex-row md:text-left">
          <h2 className="text-[24px] leading-[1.2] text-white md:text-[30px]">
            Find Out Your Home&apos;s Worth
          </h2>
          <Link
            href="/home-valuation"
            className="inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
          >
            Get Home Value
          </Link>
        </Container>
      </section>
    </main>
  )
}
