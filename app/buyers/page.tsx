import type { Metadata } from 'next'
import Image from 'next/image'
import { ContactCta } from '@/components/home/contact-cta'
import { InquiryForm } from '@/components/forms/inquiry-form'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Section, Eyebrow } from '@/components/site/section'

const META_TITLE = 'Bellevue, WA Home Buyers Guide'
const META_DESCRIPTION =
  'Learn how Abigail Anderson can assist you in purchasing your future residence. Start your house search now and learn more about the purchasing process!'
const META_IMAGE = '/images/buyers-background.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/buyers' },
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

export default function BuyersPage() {
  return (
    <main>
      <PageHero
        title="Buyer's Guide"
        imageSrc="/images/buyers-background.jpg"
        imageAlt=""
      />

      <Section>
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src="/images/buyers-image-main.jpg"
                alt="Waterfront neighborhood at sunset"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <article>
              <Eyebrow>Get Smarter for Greater Support and Results</Eyebrow>
              <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
                Navigate the Process
              </h2>
              <p className="mt-6 font-body text-[15px] leading-[1.7] text-site-text">
                Partner with a broker who specializes in home buying, boasting
                a proven track record and a customized marketing plan crafted
                to deliver impactful results. I am dedicated to understanding
                your specific needs and developing a strategy that accentuates
                the best features of the properties you&rsquo;re interested in.
                Leveraging my extensive expertise and robust industry
                connections, I ensure each home receives the utmost exposure
                it merits. My comprehensive approach includes professional
                staging, high-quality photography, and precise targeted
                advertising to engage serious buyers. Trust me to manage every
                detail of the home buying process, ensuring outcomes that
                surpass your expectations.
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
          <InquiryForm variant="property-inquiry" topic="buyers" />
        </Container>
      </Section>

      <ContactCta />
    </main>
  )
}
