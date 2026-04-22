'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Container } from '@/components/site/container'

type Neighborhood = {
  slug: string
  name: string
  image: string
}

// Home carousel features only the 4 markets Abigail highlights on the live
// site; Shoreline and Renton still have full /neighborhoods/<slug> detail
// pages (linked from the /neighborhoods index), they just aren't on Home.
const NEIGHBORHOODS: Neighborhood[] = [
  { slug: 'bellevue', name: 'Bellevue', image: '/images/home-neighborhoods-image-bellevue.jpg' },
  { slug: 'seattle', name: 'Seattle', image: '/images/home-neighborhoods-image-seattle.jpg' },
  { slug: 'newcastle', name: 'Newcastle', image: '/images/home-neighborhoods-image-newcastle.jpg' },
  { slug: 'eastside', name: 'Eastside', image: '/images/home-neighborhoods-image-eastside.jpg' },
]

export function NeighborhoodsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    window.addEventListener('resize', check)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [])

  function scrollStep(direction: 1 | -1) {
    const el = trackRef.current
    if (!el) return
    const step = Math.max(280, Math.floor(el.clientWidth * 0.6))
    const max = el.scrollWidth - el.clientWidth
    const atEnd = el.scrollLeft >= max - 2
    const atStart = el.scrollLeft <= 2
    if (direction === 1 && atEnd) {
      el.scrollTo({ left: 0, behavior: 'smooth' })
    } else if (direction === -1 && atStart) {
      el.scrollTo({ left: max, behavior: 'smooth' })
    } else {
      el.scrollBy({ left: step * direction, behavior: 'smooth' })
    }
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

          {hasOverflow && (
            <div className="hidden items-center gap-4 lg:flex">
              <button
                type="button"
                onClick={() => scrollStep(-1)}
                className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text transition-colors hover:text-site-gold"
              >
                Previous
              </button>
              <span aria-hidden className="text-site-text-muted/40">
                |
              </span>
              <button
                type="button"
                onClick={() => scrollStep(1)}
                className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text transition-colors hover:text-site-gold"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </Container>

      <div
        ref={trackRef}
        className={`mt-10 flex gap-6 overflow-x-auto scroll-smooth px-[15px] pb-4 snap-x snap-mandatory lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          hasOverflow ? '' : 'justify-center'
        }`}
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
                {n.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
