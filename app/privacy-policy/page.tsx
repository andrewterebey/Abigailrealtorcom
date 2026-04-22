import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'

const META_TITLE = 'Privacy Policy'
const META_DESCRIPTION = 'Privacy policy for abigailrealtor.com.'
// No dedicated legal-page hero — fall back to the portrait hero. Tracked
// in TODO.md.
const META_IMAGE = '/images/home-portrait-main.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/privacy-policy' },
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

/**
 * Placeholder: the live site uses `/terms-and-conditions` as the Privacy
 * Policy URL, and there is no separate `privacy-policy.md` in
 * /content/legal/. We render a short stub here and point readers at the
 * canonical Privacy Policy. Tracked in TODO.md — decide whether to keep this
 * URL as a redirect or author fresh copy.
 */
export default function PrivacyPolicyPage() {
  return (
    <main>
      <PageHero title="Privacy Policy" />
      <section className="py-16 md:py-20 lg:py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-body text-[15px] leading-[1.75] text-site-text md:text-[16px]">
              Coming soon. Our full Privacy Policy and Terms of Use is available
              at{' '}
              <Link
                href="/terms-and-conditions"
                className="text-site-gold underline underline-offset-2 hover:text-site-gold-dim"
              >
                abigailrealtor.com/terms-and-conditions
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>
    </main>
  )
}
