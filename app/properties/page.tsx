import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Container } from '@/components/site/container'
import { ListingGrid } from '@/components/listings/listing-grid'
import { ContactCta } from '@/components/home/contact-cta'
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

const DEFAULT_LIMIT = 12

type ApiResponse = {
  items: ListingSummary[]
  total: number
  limit: number
  offset: number
}

async function fetchListings(search: URLSearchParams): Promise<ApiResponse> {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const qs = search.toString()
  const res = await fetch(
    `${protocol}://${host}/api/listings${qs ? `?${qs}` : ''}`,
    { next: { revalidate: 60 } },
  )
  if (!res.ok) {
    return { items: [], total: 0, limit: DEFAULT_LIMIT, offset: 0 }
  }
  return res.json()
}

type SearchParams = {
  limit?: string
  offset?: string
  status?: string
  city?: string
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const rawLimit = Number.parseInt(sp.limit ?? '', 10)
  const rawOffset = Number.parseInt(sp.offset ?? '', 10)
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 50
      ? rawLimit
      : DEFAULT_LIMIT
  const offset =
    Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0

  const apiParams = new URLSearchParams()
  apiParams.set('limit', String(limit))
  apiParams.set('offset', String(offset))
  if (sp.status) apiParams.set('status', sp.status)
  if (sp.city) apiParams.set('city', sp.city)

  const { items, total } = await fetchListings(apiParams)

  const page = Math.floor(offset / limit) + 1
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const hasPrev = offset > 0
  const hasNext = offset + limit < total

  const buildHref = (nextOffset: number) => {
    const p = new URLSearchParams()
    p.set('limit', String(limit))
    p.set('offset', String(Math.max(0, nextOffset)))
    if (sp.status) p.set('status', sp.status)
    if (sp.city) p.set('city', sp.city)
    return `/properties?${p.toString()}`
  }

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
          <p className="mt-4 font-body text-[14px] font-bold uppercase tracking-[0.14em] text-white">
            Homes Represented by Abigail Anderson
          </p>
        </Container>
      </section>

      <section aria-label="All listings" className="py-16 md:py-20 lg:py-24">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
            <div>
              <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
                Featured Properties
              </p>
              <h2 className="mt-2 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
                Current &amp; Past Listings
              </h2>
            </div>
            <p className="font-body text-[13px] uppercase tracking-[0.12em] text-site-text-muted">
              {total} total · Page {page} of {pageCount}
            </p>
          </div>

          <ListingGrid items={items} />

          {(hasPrev || hasNext) && (
            <nav
              aria-label="Pagination"
              className="mt-16 flex items-center justify-between"
            >
              {hasPrev ? (
                <Link
                  href={buildHref(offset - limit)}
                  className="border border-black/15 bg-white px-6 py-3 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-site-text hover:border-site-gold hover:text-site-gold"
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              {hasNext ? (
                <Link
                  href={buildHref(offset + limit)}
                  className="border border-black/15 bg-white px-6 py-3 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-site-text hover:border-site-gold hover:text-site-gold"
                >
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </Container>
      </section>

      <ContactCta />
    </main>
  )
}
