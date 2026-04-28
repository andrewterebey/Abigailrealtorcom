import type { Metadata } from 'next'
import Image from 'next/image'
import { InquiryForm } from '@/components/forms/inquiry-form'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Section, Eyebrow } from '@/components/site/section'
import { SectionPillBadge } from '@/components/site/section-pill-badge'

const META_TITLE = 'Option Services | Bellevue, WA'
const META_DESCRIPTION =
  'Are you interested in learning more about the real estate market? Unlock the gateway to seamless communication by sharing your contact details on this page!'
const META_IMAGE = '/images/options-background.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/options' },
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

export default function OptionsPage() {
  return (
    <main>
      <PageHero
        title="Option Services"
        imageSrc="/images/options-background.jpg"
        imageAlt=""
      />

      <Section>
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src="/images/options-image-main.jpg"
                alt="Seattle skyline at sunset with mountains behind"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <SectionPillBadge>Exclusive</SectionPillBadge>
            </div>
            <article>
              <Eyebrow>Tailored Support Every Step of the Way</Eyebrow>
              <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
                Beyond the Basics
              </h2>
              <p className="mt-6 font-body text-[15px] leading-[1.7] text-site-text">
                Partner with real estate experts to explore investment
                properties with hassle-free buying and selling options that
                are quick, straightforward, and designed to meet your needs.
                Our market analysis provides a comprehensive overview of
                current trends, ensuring your transactions are competitively
                priced and well-informed. Whether you&rsquo;re looking to
                sell your property &ldquo;as is&rdquo; for a faster closing or
                seeking new opportunities, we offer solutions that save you
                time and money. Our marketing strategies leverage both online
                and offline channels to maximize exposure, ensuring faster
                sales and seamless transactions. Let us guide you through the
                process of buying or selling investment properties with
                expertise, efficiency, and personalized care.
              </p>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                Ready to sell your property at the highest and best value?
                Learn more about our home selling services and how we can help
                you maximize your returns through expert pricing, targeted
                marketing, and professional negotiation.
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
          <InquiryForm variant="property-inquiry" topic="options" />
        </Container>
      </Section>
    </main>
  )
}
