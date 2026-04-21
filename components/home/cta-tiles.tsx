import Image from 'next/image'
import Link from 'next/link'

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

export function CtaTiles() {
  return (
    <section aria-label="Explore your real estate options" className="bg-black">
      <div className="grid gap-0 md:grid-cols-3">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
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
        ))}
      </div>
    </section>
  )
}
