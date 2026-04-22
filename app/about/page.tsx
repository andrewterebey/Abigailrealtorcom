import type { Metadata } from 'next'
import Image from 'next/image'
import { ContactCta } from '@/components/home/contact-cta'
import { Testimonials } from '@/components/home/testimonials'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'

const META_TITLE = 'Meet Abigail Anderson — Bellevue, WA Real Estate Agent'
const META_DESCRIPTION =
  'Abigail Anderson can help you discover your dream home or sell yours in Washington. Call now for a consultation and info on real estate listings in the area.'
const META_IMAGE = '/images/about-background.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/about' },
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

const AGENT = {
  name: 'Abigail Anderson',
  role: 'Real Estate Agent',
  phone: '(425) 236-2853',
  email: 'abigaila@johnlscott.com',
  license: '25001620',
  addressLine1: '11040 Main St Ste 200,',
  addressLine2: 'Bellevue, WA 98004',
} as const

export default function AboutPage() {
  return (
    <main>
      <PageHero
        title="About Abigail"
        imageSrc="/images/about-background.jpg"
        imageAlt=""
      />

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              <Image
                src="/images/about-bio-portrait-agent-photo.jpg"
                alt="Abigail Anderson portrait"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            </div>

            <article className="flex flex-col">
              <h2 className="text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
                Meet Abigail
              </h2>
              <p className="mt-6 font-body text-[15px] leading-[1.7] text-site-text">
                Welcome to King County&rsquo;s vibrant real estate scene! As
                Abigail Anderson, I am dedicated to helping first-time buyers,
                seasoned homeowners, and investors navigate the exciting world
                of real estate with ease. My deep commitment to each
                client&rsquo;s success ensures a personalized and satisfying
                experience.
              </p>

              <h3 className="mt-10 text-[24px] leading-[1.2] md:text-[28px] lg:text-[30px]">
                Personalized Property Searches
              </h3>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                Whether you&rsquo;re seeking on-market gems or exclusive
                off-market deals, I ensure you have access to the best
                properties that meet your criteria. Additionally, for those
                interested in the latest interior trends and architectural
                designs, explore more here.
              </p>

              <h3 className="mt-10 text-[24px] leading-[1.2] md:text-[28px] lg:text-[30px]">
                Expert Negotiation
              </h3>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                Utilizing my extensive experience and keen market insights, I
                negotiate the best possible terms to protect your interests and
                maximize your investment. As a result, this meticulous
                attention ensures you are well-represented in every deal.
              </p>

              <h3 className="mt-10 text-[24px] leading-[1.2] md:text-[28px] lg:text-[30px]">
                Seamless Transactions
              </h3>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                From the initial consultation to the closing day, I streamline
                the process. My goal is to make your real estate experience
                smooth and stress-free. Furthermore, I am dedicated to
                overcoming any hurdles that might appear during the buying or
                selling process.
              </p>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                Real Estate is My Passion. Ever since I was young, the
                potential to transform lives through real estate has captivated
                me. Therefore, I am committed to more than just transactions; I
                help you navigate significant life transitions, whether opening
                new doors or closing old ones.
              </p>

              <h3 className="mt-10 text-[24px] leading-[1.2] md:text-[28px] lg:text-[30px]">
                Let&rsquo;s Make an Impact Together
              </h3>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                Join me, Abigail Anderson, as we shape your future in King
                County&rsquo;s dynamic real estate environment. Likewise, I am
                here to support your journey, ensuring that every step we take
                together leads toward achieving your dreams.
              </p>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                Ready to start your real estate journey? Contact me today or
                visit my contact page to schedule your personal consultation.
              </p>
            </article>
          </div>
        </Container>
      </Section>

      {/* Dark agent info card, matches the live About layout. */}
      <section aria-label="Agent contact card" className="pb-16 md:pb-20 lg:pb-24">
        <Container>
          <div className="bg-black px-8 py-10 text-white md:px-12 md:py-12">
            <h3 className="text-[24px] text-white md:text-[28px]">
              {AGENT.name}
            </h3>
            <p className="mt-1 font-body text-[13px] tracking-[0.04em] text-white/70">
              {AGENT.role}
            </p>

            <dl className="mt-8 grid gap-8 md:grid-cols-4">
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                  Phone
                </dt>
                <dd className="mt-2 font-body text-[14px]">
                  <a
                    href={`tel:${AGENT.phone.replace(/[^\d+]/g, '')}`}
                    className="hover:text-site-gold"
                  >
                    {AGENT.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                  Email
                </dt>
                <dd className="mt-2 font-body text-[14px] break-all">
                  <a
                    href={`mailto:${AGENT.email}`}
                    className="hover:text-site-gold"
                  >
                    {AGENT.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                  License Number
                </dt>
                <dd className="mt-2 font-body text-[14px]">{AGENT.license}</dd>
              </div>
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                  Address
                </dt>
                <dd className="mt-2 font-body text-[14px] not-italic">
                  <address className="not-italic">
                    {AGENT.addressLine1}
                    <br />
                    {AGENT.addressLine2}
                  </address>
                </dd>
              </div>
            </dl>
          </div>
        </Container>
      </section>

      <Testimonials />

      <ContactCta />
    </main>
  )
}
