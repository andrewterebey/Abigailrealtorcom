import type { Metadata } from 'next'
import { CtaTiles } from '@/components/home/cta-tiles'
import { GetToKnow } from '@/components/home/get-to-know'
import { Hero } from '@/components/home/hero'
import { IntroBand } from '@/components/home/intro-band'
import { NeighborhoodsCarousel } from '@/components/home/neighborhoods-carousel'
import { Newsletter } from '@/components/home/newsletter'
import { SpotlightListings } from '@/components/home/spotlight-listings'
import { Testimonials } from '@/components/home/testimonials'
import {
  localBusinessJsonLd,
  realEstateAgentJsonLd,
} from '@/lib/structured-data'

const HOME_TITLE = 'Abigail Anderson — King County Real Estate Expert'
const HOME_DESCRIPTION =
  'In Bellevue, Kirkland and more. Abigail Anderson is your trusted partner for real estate that appreciates in value. Let\u2019s achieve your property goals together.'

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: 'website',
    url: '/',
    images: [
      {
        url: '/images/home-portrait-main.jpg',
        width: 1200,
        height: 1200,
        alt: 'Abigail Anderson — King County Real Estate Expert',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['/images/home-portrait-main.jpg'],
  },
}

export default function Home() {
  const agent = realEstateAgentJsonLd()
  const business = localBusinessJsonLd()
  return (
    <main>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agent) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(business) }}
      />
      <Hero />
      <IntroBand />
      <GetToKnow />
      <CtaTiles />
      <Testimonials />
      <NeighborhoodsCarousel />
      <SpotlightListings />
      <Newsletter />
    </main>
  )
}
