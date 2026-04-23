import type { Metadata } from 'next'
import Image from 'next/image'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'
import testimonialsData from '@/content/testimonials.json'

const META_TITLE = 'Client Testimonials — Abigail Anderson'
const META_DESCRIPTION =
  'Read what past buyers and sellers have to say about working with Abigail Anderson, a John L. Scott real estate agent serving Bellevue and King County.'
const META_IMAGE = '/images/testimonials-background.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/testimonials' },
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

type Testimonial = {
  id: string
  author: string
  quote: string
}

const TESTIMONIALS: Testimonial[] = testimonialsData.testimonials

export default function TestimonialsPage() {
  return (
    <main>
      <PageHero
        title="Testimonials"
        imageSrc="/images/testimonials-background.jpg"
        imageAlt=""
      />

      <Section>
        <Container>
          {/* Live lays each testimonial out in a single full-width column
              with generous vertical spacing. */}
          <ul className="mx-auto max-w-4xl space-y-16 md:space-y-20">
            {TESTIMONIALS.map((t) => (
              <li key={t.id}>
                <article>
                  <div className="flex items-center gap-4">
                    <Image
                      src="/images/testimonials-testimonial.png"
                      alt=""
                      width={64}
                      height={64}
                      className="h-10 w-auto object-contain"
                    />
                    <h2 className="text-[22px] leading-[1.3] md:text-[26px]">
                      {t.author}
                    </h2>
                  </div>
                  <blockquote>
                    <p className="mt-5 font-body text-[15px] leading-[1.75] text-site-text">
                      {t.quote}
                    </p>
                  </blockquote>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </main>
  )
}
