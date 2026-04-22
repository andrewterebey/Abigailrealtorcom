import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
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

const CONTACT = {
  email: 'abigaila@johnlscott.com',
  phone: '(425) 236-2853',
  addressLine1: '11040 Main St Suite 200',
  addressLine2: 'Bellevue, WA 98004',
  // Instagram handle is a placeholder pending confirmation from Abigail
  // (see TODO.md — Instagram feed / handle).
  instagramHandle: 'abigailanderson.realtor',
  instagramUrl: 'https://instagram.com/abigailanderson.realtor',
} as const

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
          <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
            {/* Form column. */}
            <div>
              <Eyebrow>Get In Touch</Eyebrow>
              <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
                Submit a Message
              </h2>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                Fill out the form below to learn more about buying or selling
                a house in your area.
              </p>

              <div className="mt-10">
                <InquiryForm variant="contact" topic="contact" />
              </div>
            </div>

            {/* Contact info column. */}
            <aside
              aria-label="Abigail Anderson contact details"
              className="border-t border-black/10 pt-10 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0"
            >
              <h3 className="text-[24px] leading-[1.2] md:text-[28px]">
                Abigail Anderson
              </h3>
              <p className="mt-1 font-body text-[13px] uppercase tracking-[0.14em] text-site-text-muted">
                John L. Scott Real Estate
              </p>

              <dl className="mt-8 space-y-8">
                <div className="flex items-start gap-4">
                  <Mail className="mt-1 size-5 text-site-gold" aria-hidden />
                  <div>
                    <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                      Email
                    </dt>
                    <dd className="mt-1 font-body text-[14px]">
                      <a
                        href={`mailto:${CONTACT.email}`}
                        className="hover:text-site-gold"
                      >
                        {CONTACT.email}
                      </a>
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="mt-1 size-5 text-site-gold" aria-hidden />
                  <div>
                    <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                      Phone Number
                    </dt>
                    <dd className="mt-1 font-body text-[14px]">
                      <a
                        href={`tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`}
                        className="hover:text-site-gold"
                      >
                        {CONTACT.phone}
                      </a>
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="mt-1 size-5 text-site-gold" aria-hidden />
                  <div>
                    <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                      Address
                    </dt>
                    <dd className="mt-1 font-body text-[14px]">
                      <address className="not-italic">
                        {CONTACT.addressLine1}
                        <br />
                        {CONTACT.addressLine2}
                      </address>
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  {/* Inline Instagram glyph — lucide-react 1.x doesn't ship it. */}
                  <svg
                    className="mt-1 size-5 text-site-gold"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37a4 4 0 1 1-7.914 1.125A4 4 0 0 1 16 11.37Z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  <div>
                    <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                      Instagram
                    </dt>
                    <dd className="mt-1 font-body text-[14px]">
                      {/* Handle is a placeholder pending confirmation — see TODO.md. */}
                      <Link
                        href={CONTACT.instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-site-gold"
                      >
                        @{CONTACT.instagramHandle}
                      </Link>
                    </dd>
                  </div>
                </div>
              </dl>
            </aside>
          </div>
        </Container>
      </Section>
    </main>
  )
}
