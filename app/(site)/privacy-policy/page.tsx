import type { Metadata } from 'next'
import { Container } from '@/components/site/container'
import { LegalBody } from '@/components/site/legal-body'
import { PageHero } from '@/components/site/page-hero'
import { loadLegalBody } from '@/lib/legal-content'

const META_TITLE = 'Privacy Policy'
const META_DESCRIPTION =
  'Privacy policy and terms of use for abigailrealtor.com.'
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
 * The full Privacy Policy / Terms of Use document, rendered verbatim from
 * /content/legal/terms-and-conditions.md (CLAUDE.md §12). This is the URL
 * the footer and every form's opt-in text link to, and the one given to
 * Follow Up Boss for SMS registration — it must render the real document,
 * not a stub. `/terms-and-conditions` (the old Luxury Presence slug) serves
 * the same document and points its canonical here.
 */
export default async function PrivacyPolicyPage() {
  const blocks = await loadLegalBody('terms-and-conditions.md')
  return (
    <main>
      <PageHero title="Privacy Policy" />
      <section className="py-16 md:py-20 lg:py-24">
        <Container>
          <div className="mx-auto max-w-[720px]">
            <LegalBody blocks={blocks} />
          </div>
        </Container>
      </section>
    </main>
  )
}
