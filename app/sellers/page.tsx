import type { Metadata } from 'next'
import Image from 'next/image'
import { ContactCta } from '@/components/home/contact-cta'
import { InquiryForm } from '@/components/forms/inquiry-form'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Section, Eyebrow } from '@/components/site/section'

const META_TITLE = 'Expert Advice for Selling in Bellevue, WA'
const META_DESCRIPTION =
  "With the help of Abigail Anderson's professional selling recommendations, learn how to streamline and reap the benefits of the selling process in Washington!"
// No `/public/images/sellers-background.jpg` exists yet — fall back to the
// portrait hero. Tracked in TODO.md.
const META_IMAGE = '/images/home-portrait-main.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/sellers' },
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

export default function SellersPage() {
  return (
    <main>
      <PageHero
        title="Seller's Guide"
        imageSrc="/images/home-gallery-portrait.jpg"
        imageAlt=""
      />

      <Section>
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src="/images/home-neighborhoods-image-seattle.jpg"
                alt="Seattle skyline at sunset"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <article>
              <Eyebrow>Ready to Sell</Eyebrow>
              <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
                List with Confidence
              </h2>
              <p className="mt-6 font-body text-[15px] leading-[1.7] text-site-text">
                As a Certified Relocation Expert dedicated to home selling, I
                am committed to helping you achieve a smooth and profitable
                sale of your home, whether it&rsquo;s around the corner or
                across the globe. With a tailored approach that leverages my
                extensive experience in the real estate market, I focus on
                delivering personalized services and strategies that enhance
                the visibility and appeal of your property to attract serious
                buyers.
              </p>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                For those looking for an expedited home selling process,
                consider our market selling options. This unique approach
                allows you to sell your home as-is, avoiding the hassle of
                extensive preparations and open houses and often results in
                faster sale times. Learn more about how this streamlined
                option can benefit you by visiting our dedicated page.
              </p>
            </article>
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <div className="mb-10 text-center">
            <Eyebrow>Let&rsquo;s Connect</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              Property Inquiry
            </h2>
          </div>
          <InquiryForm variant="property-inquiry" topic="sellers" />
        </Container>
      </Section>

      <ContactCta />
    </main>
  )
}
