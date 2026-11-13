import type { Metadata } from 'next'
import { Container } from '@/components/site/container'
import { LegalBody } from '@/components/site/legal-body'
import { PageHero } from '@/components/site/page-hero'
import { loadLegalBody } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: 'DMCA Notice',
  description:
    'DMCA copyright infringement notice and counter-notification procedures.',
  alternates: { canonical: '/dmca-notice' },
}

/**
 * DMCA notice — rendered VERBATIM from /content/legal/dmca-notice.md per
 * CLAUDE.md §12 ("Legal text is verbatim"). Do not paraphrase or reformat.
 */
export default async function DmcaNoticePage() {
  const blocks = await loadLegalBody('dmca-notice.md')
  return (
    <main>
      <PageHero title="DMCA Notice" />
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
