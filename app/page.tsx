import { CtaTiles } from '@/components/home/cta-tiles'
import { GetToKnow } from '@/components/home/get-to-know'
import { Hero } from '@/components/home/hero'
import { IntroBand } from '@/components/home/intro-band'
import { NeighborhoodsCarousel } from '@/components/home/neighborhoods-carousel'
import { Newsletter } from '@/components/home/newsletter'
import { ReadyToBegin } from '@/components/home/ready-to-begin'
import { SpotlightListings } from '@/components/home/spotlight-listings'
import { Testimonials } from '@/components/home/testimonials'

export default function Home() {
  return (
    <main>
      <Hero />
      <IntroBand />
      <GetToKnow />
      <CtaTiles />
      <Testimonials />
      <NeighborhoodsCarousel />
      <SpotlightListings />
      <Newsletter />
      <ReadyToBegin />
    </main>
  )
}
