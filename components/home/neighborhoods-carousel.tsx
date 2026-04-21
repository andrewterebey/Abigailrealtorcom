'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { Container } from '@/components/site/container'

type Neighborhood = {
  slug: string
  name: string
  image: string
}

const NEIGHBORHOODS: Neighborhood[] = [
  { slug: 'bellevue', name: 'Bellevue', image: '/images/home-neighborhoods-image-bellevue.jpg' },
  { slug: 'seattle', name: 'Seattle', image: '/images/home-neighborhoods-image-seattle.jpg' },
  { slug: 'newcastle', name: 'Newcastle', image: '/images/home-neighborhoods-image-newcastle.jpg' },
  { slug: 'eastside', name: 'Eastside', image: '/images/home-neighborhoods-image-eastside.jpg' },
  { slug: 'shoreline', name: 'Shoreline', image: '/images/home-neighborhoods-image-shoreline.jpg' },
  { slug: 'renton', name: 'Renton', image: '/images/home-neighborhoods-image-renton.jpg' },
]

export function NeighborhoodsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)

  function scrollBy(delta: number) {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <section
      aria-label="Neighborhood guides"
      className="py-16 md:py-20 lg:py-24"
    >
      <Container>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
              Areas We Serve
            </p>
            <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              Neighborhood Guides
            </h2>
          </div>

          <div className="hidden gap-2 lg:flex">
            <button
              type="button"
              onClick={() => scrollBy(-360)}
              aria-label="Previous neighborhoods"
              className="border border-black/10 p-3 text-site-text transition-colors hover:border-site-gold hover:text-site-gold"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(360)}
              aria-label="Next neighborhoods"
              className="border border-black/10 p-3 text-site-text transition-colors hover:border-site-gold hover:text-site-gold"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </Container>

      <div
        ref={trackRef}
        className="mt-10 flex gap-6 overflow-x-auto scroll-smooth px-[15px] pb-4 snap-x snap-mandatory lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {NEIGHBORHOODS.map((n) => (
          <Link
            key={n.slug}
            href={`/neighborhoods/${n.slug}`}
            className="group block w-[280px] shrink-0 snap-start md:w-[320px]"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={n.image}
                alt={`${n.name} neighborhood`}
                fill
                sizes="(min-width: 768px) 320px, 280px"
                className="object-cover transition-transform duration-[700ms] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text">
                Explore {n.name}
              </span>
              <ChevronRight className="size-4 text-site-gold transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
