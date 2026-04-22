import type { Metadata } from 'next'
import Image from 'next/image'
import { Container } from '@/components/site/container'
import { HomeSearchClient } from '@/components/listings/home-search-client'
import { ContactCta } from '@/components/home/contact-cta'

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

export default function HomeSearchListingsPage() {
  return (
    <main>
      <section
        aria-label="Home search"
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
        <div className="absolute inset-0 bg-black/50" aria-hidden />
        <Container className="relative z-10 flex flex-col items-center py-28 text-center md:py-32 lg:py-36">
          <h1 className="text-[44px] leading-[1.1] text-white md:text-[60px] lg:text-[70px]">
            Home Search
          </h1>
          <p className="mt-4 font-body text-[14px] font-bold uppercase tracking-[0.14em] text-white">
            Find Your Next King County Home
          </p>
        </Container>
      </section>

      <section aria-label="Search results" className="py-16 md:py-20 lg:py-24">
        <Container>
          <HomeSearchClient />
        </Container>
      </section>

      <ContactCta />
    </main>
  )
}
