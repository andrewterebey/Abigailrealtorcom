import { CtaTiles } from '@/components/home/cta-tiles'
import { GetToKnow } from '@/components/home/get-to-know'
import { Hero } from '@/components/home/hero'
import { IntroBand } from '@/components/home/intro-band'
import { Testimonials } from '@/components/home/testimonials'

export default function Home() {
  return (
    <main>
      <Hero />
      <IntroBand />
      <GetToKnow />
      <CtaTiles />
      <Testimonials />
    </main>
  )
}
