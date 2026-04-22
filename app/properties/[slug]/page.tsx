import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { ListingDetail } from '@/components/listings/listing-detail'
import { ContactCta } from '@/components/home/contact-cta'
import type { ListingDetail as ListingDetailType } from '@/types/listing'

type RouteParams = { slug: string }

async function fetchDetail(slug: string): Promise<ListingDetailType | null> {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  // provider.get() accepts either id or slug — the [id] route forwards straight
  // to the provider, so passing the slug here works.
  const res = await fetch(
    `${protocol}://${host}/api/listings/${encodeURIComponent(slug)}`,
    { next: { revalidate: 300 } },
  )
  if (res.status === 404) return null
  if (!res.ok) return null
  return (await res.json()) as ListingDetailType
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const { slug } = await params
  const listing = await fetchDetail(slug)
  if (!listing) {
    return {
      title: 'Listing Not Found',
      description: 'That listing is no longer available.',
    }
  }
  const priceLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(listing.price)
  const title = `${listing.address}, ${listing.city} — ${priceLabel}`
  const description = `${listing.beds} bed, ${listing.baths} bath, ${listing.sqft.toLocaleString()} sqft home in ${listing.city}, WA. Represented by Abigail Anderson.`
  return {
    title,
    description,
    alternates: { canonical: `/properties/${listing.slug}` },
    openGraph: {
      title,
      description,
      url: `/properties/${listing.slug}`,
      type: 'website',
      images: [{ url: listing.primaryImage }],
    },
  }
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const { slug } = await params
  const listing = await fetchDetail(slug)
  if (!listing) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: listing.address,
    description: listing.description,
    url: `https://abigailrealtor.com/properties/${listing.slug}`,
    image: listing.images?.length ? listing.images : [listing.primaryImage],
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: listing.state,
      postalCode: listing.zip,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: listing.coordinates.lat,
      longitude: listing.coordinates.lng,
    },
    numberOfRooms: listing.beds,
    numberOfBathroomsTotal: listing.baths,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: listing.sqft,
      unitCode: 'FTK',
    },
    yearBuilt: listing.yearBuilt,
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'USD',
      availability:
        listing.status === 'for-sale'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <main>
      <script
        type="application/ld+json"
        // JSON-LD per CLAUDE.md §10 — Residence block for property pages.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ListingDetail listing={listing} />
      <ContactCta />
    </main>
  )
}
