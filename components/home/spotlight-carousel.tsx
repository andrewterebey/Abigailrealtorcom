'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ListingCard } from '@/components/listings/listing-card'
import type { ListingSummary } from '@/types/listing'

/**
 * Single-card carousel matching the live home Spotlight Listings, where the
 * grid view (3-up) was replaced by a one-at-a-time carousel with PREV/NEXT
 * text controls above the card.
 */
export function SpotlightCarousel({ items }: { items: ListingSummary[] }) {
  const [index, setIndex] = useState(0)
  const total = items.length
  const current = items[index]

  function go(delta: number) {
    setIndex((i) => (i + delta + total) % total)
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-end gap-6 text-left font-body text-[12px] uppercase tracking-[0.2em] text-site-text">
        <button
          type="button"
          onClick={() => go(-1)}
          className="transition-colors hover:text-site-gold"
          aria-label="Previous listing"
        >
          ‹ Previous
        </button>
        <span aria-hidden className="text-site-text-muted">
          |
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          className="transition-colors hover:text-site-gold"
          aria-label="Next listing"
        >
          Next ›
        </button>
      </div>

      <div className="mx-auto mt-6 max-w-md text-left">
        <ListingCard key={current.id} listing={current} priority />
      </div>

      <Link
        href="/properties"
        className="mt-12 inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
      >
        View All
      </Link>
    </div>
  )
}
