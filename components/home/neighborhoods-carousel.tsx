'use client'

import Image from 'next/image'
import Link from 'next/link'
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

          <div className="hidden items-center gap-4 lg:flex">
            <button
              type="button"
              onClick={() => scrollBy(-360)}
              className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text transition-colors hover:text-site-gold"
            >
              Previous
            </button>
            <span aria-hidden className="text-site-text-muted/40">
              |
            </span>
            <button
              type="button"
              onClick={() => scrollBy(360)}
              className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text transition-colors hover:text-site-gold"
            >
              Next
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
            <div className="mt-4 flex items-center gap-3">
              <span aria-hidden className="h-4 w-px bg-site-gold" />
              <span className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text transition-colors group-hover:text-site-gold">
                Explore {n.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
