import { GetToKnow } from '@/components/home/get-to-know'
import { Hero } from '@/components/home/hero'
import { IntroBand } from '@/components/home/intro-band'

export default function Home() {
  return (
    <main>
      <Hero />
      <IntroBand />
      <GetToKnow />
    </main>
  )
}
