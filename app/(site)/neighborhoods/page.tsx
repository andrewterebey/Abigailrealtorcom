import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/site/container'
import { Eyebrow } from '@/components/site/section'
import {
  NEIGHBORHOODS,
  NEIGHBORHOOD_SLUGS,
  readNeighborhoodsIndexIntro,
} from '@/lib/neighborhoods'

const META_TITLE = 'Explore Washington Neighborhoods - A Comprehensive Guide'
const META_DESCRIPTION =
  'Learn more about neighborhoods in Washington to help you decide which one is best for you. Contact Abigail Anderson today for other information. Call her now!'
const META_IMAGE = '/images/neighborhoods-background.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/neighborhoods' },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [{ url: META_IMAGE, width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [META_IMAGE],
  },
}

export default function NeighborhoodsIndexPage() {
  const intro = readNeighborhoodsIndexIntro()

  return (
    <main>
      {/* Hero */}
      <section
        aria-label="Neighborhoods hero"
        className="relative flex min-h-[360px] items-center justify-center overflow-hidden text-white md:min-h-[440px] lg:min-h-[520px]"
      >
        <Image
          src="/images/neighborhoods-background.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <Container className="relative z-10 py-24 text-center md:py-28 lg:py-32">
          <h1 className="text-[44px] leading-[1.1] text-white sm:text-[60px] lg:text-[70px]">
            Neighborhoods
          </h1>
        </Container>
      </section>

      {/* Intro + grid */}
      <section className="py-16 md:py-20 lg:py-24">
        <Container>
          <div className="mx-auto mb-14 max-w-3xl text-center md:mb-16">
            <Eyebrow>{intro.eyebrow}</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              {intro.heading}
            </h2>
            {intro.paragraph ? (
              <p className="mt-6 font-body text-[15px] leading-[1.7] text-site-text md:text-[16px]">
                {intro.paragraph}
              </p>
            ) : null}
          </div>

          {/* Live: 3x2 grid of full-bleed image tiles with the city name
              centered over a dark overlay. No separate caption/description
              row below. */}
          <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
            {NEIGHBORHOOD_SLUGS.map((slug) => {
              const n = NEIGHBORHOODS[slug]
              return (
                <li key={slug}>
                  <Link
                    href={`/neighborhoods/${slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={n.cardImage}
                        alt={`${n.name} neighborhood`}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-[700ms] group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/40" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <h3 className="text-[30px] leading-[1.1] text-white lg:text-[36px]">
                          {n.name}
                        </h3>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Container>
      </section>

      {/* Dark band CTA — matches live. */}
      <section
        aria-label="Start your property search"
        className="bg-black text-white"
      >
        <Container className="flex flex-col items-center justify-between gap-6 py-10 text-center md:flex-row md:text-left">
          <h2 className="text-[24px] leading-[1.2] text-white md:text-[30px]">
            Start Your Property Search
          </h2>
          <Link
            href="/home-search/listings"
            className="inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
          >
            Browse Homes
          </Link>
        </Container>
      </section>
    </main>
  )
}
