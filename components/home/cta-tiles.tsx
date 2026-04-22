'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

type Tile = {
  label: string
  href: string
  image: string
  alt: string
}

const TILES: Tile[] = [
  {
    label: "I'm Buying",
    href: '/buyers',
    image: '/images/home-portrait-image.png',
    alt: 'Modern kitchen with waterfall island',
  },
  {
    label: "I'm Selling",
    href: '/sellers',
    image: '/images/home-gallery-portrait.jpg',
    alt: 'Cozy living room with wood stove',
  },
  {
    label: "I'm Looking for Options",
    href: '/options',
    image: '/images/home-background.png',
    alt: 'Lakeside firepit at sunset',
  },
]

// Mobile shows one tile at a time; tablet/desktop show all three.
// Arrows + dots drive the mobile slide index; on large screens the tiles just
// render as a static 3-column row but the controls still cycle through the
// same state so there's no viewport-specific divergence.
export function CtaTiles() {
  const [index, setIndex] = useState(0)

  const prev = () =>
    setIndex((i) => (i - 1 + TILES.length) % TILES.length)
  const next = () => setIndex((i) => (i + 1) % TILES.length)

  return (
    <section aria-label="Explore your real estate options" className="relative bg-black">
      <button
        type="button"
        onClick={prev}
        aria-label="Previous option"
        className="absolute left-0 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center bg-site-gold text-white transition-colors hover:bg-site-gold-dim"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next option"
        className="absolute right-0 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center bg-site-gold text-white transition-colors hover:bg-site-gold-dim"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Desktop + tablet: all 3 tiles visible side by side. */}
      <div className="hidden md:grid md:grid-cols-3">
        {TILES.map((tile) => (
          <TileCard key={tile.href} tile={tile} />
        ))}
      </div>

      {/* Mobile: one tile at a time, synced to `index`. */}
      <div className="md:hidden">
        <TileCard tile={TILES[index]} />
      </div>

      <div className="flex justify-center gap-2 pb-6 pt-4" role="tablist" aria-label="Options">
        {TILES.map((tile, i) => (
          <button
            key={tile.href}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={tile.label}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === index ? 'bg-site-gold' : 'bg-white/30 hover:bg-site-gold/60'
            }`}
          />
        ))}
      </div>
    </section>
  )
}

function TileCard({ tile }: { tile: Tile }) {
  return (
    <Link
      href={tile.href}
      className="group relative block aspect-[4/3] overflow-hidden text-white"
    >
      <Image
        src={tile.image}
        alt={tile.alt}
        fill
        sizes="(min-width: 768px) 33vw, 100vw"
        className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/55" />
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <span className="font-display text-[28px] uppercase leading-tight tracking-[0.06em] lg:text-[32px]">
          {tile.label}
        </span>
      </div>
    </Link>
  )
}
