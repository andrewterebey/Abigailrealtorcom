import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { InquiryForm } from '@/components/forms/inquiry-form'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Section, Eyebrow } from '@/components/site/section'

const META_TITLE = 'Get In Touch — Bellevue, WA Real Estate'
const META_DESCRIPTION =
  'Reach out to Abigail Anderson for expert real estate services. Buy, sell, or rent properties with confidence. Contact her today for more information on listings!'
// No dedicated contact background asset — fall back to the portrait hero
// per CLAUDE.md guidance. Tracked in TODO.md.
const META_IMAGE = '/images/home-portrait-main.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/contact' },
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

export default function ContactPage() {
  return (
    <main>
      <PageHero
        title="Let's Connect"
        imageSrc="/images/home-contact-background.jpg"
        imageAlt=""
      />

      <Section>
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Get In Touch</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              Submit a Message
            </h2>
            <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
              Fill out the form below to learn more about buying or selling
              a house in your area.
            </p>
          </div>

          {/* Live: portrait image LEFT, form RIGHT in a 2-col grid. */}
          <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              <Image
                src="/images/about-bio-portrait-agent-photo.jpg"
                alt="Abigail Anderson portrait"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <InquiryForm variant="contact" topic="contact" />
            </div>
          </div>
        </Container>
      </Section>

      {/* Dark quick-nav tile band (matches live "HOME / HOME SEARCH /
          HOME VALUATION" section). */}
      <section aria-label="Explore more" className="bg-black text-white">
        <ul className="grid grid-cols-1 md:grid-cols-3">
          {(
            [
              {
                label: 'Home',
                href: '/',
                image: '/images/home-cta-selling.jpg',
              },
              {
                label: 'Home Search',
                href: '/home-search/listings',
                image: '/images/home-cta-buying.jpg',
              },
              {
                label: 'Home Valuation',
                href: '/home-valuation',
                image: '/images/home-cta-options.jpg',
              },
            ] as const
          ).map((tile) => (
            <li key={tile.label} className="relative">
              <Link
                href={tile.href}
                className="group relative block aspect-[4/3] overflow-hidden text-white"
              >
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/55" />
                <div className="absolute inset-0 flex items-end p-8">
                  <span className="font-display text-[22px] uppercase leading-tight tracking-[0.06em] md:text-[26px] lg:text-[28px]">
                    {tile.label}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
