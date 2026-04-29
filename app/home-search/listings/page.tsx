import type { Metadata } from 'next'
import { HomeSearchClient } from '@/components/listings/home-search-client'

export const metadata: Metadata = {
  title: 'Home Search',
  description:
    'Search King County homes for sale by city, price, beds, baths, and property type. Placeholder IDX data during development.',
  alternates: { canonical: '/home-search/listings' },
  openGraph: {
    title: 'Home Search | Abigail Anderson',
    description:
      'Search King County homes for sale by city, price, beds, baths, and property type.',
    url: '/home-search/listings',
    type: 'website',
  },
}

// The IDX search page mirrors the live site: a single full-bleed working
// surface (toolbar + split-pane grid/map) with no hero and no marketing
// CTA. The site header is fixed-position and ~80px tall, so we offset the
// page content by that much instead of relying on a hero band to push it
// down.
export default function HomeSearchListingsPage() {
  return (
    <main aria-label="Home search" className="pt-[72px] lg:pt-[80px]">
      <HomeSearchClient />
    </main>
  )
}
