'use client'

import { usePathname } from 'next/navigation'
import { Container } from './container'
import { buildDisclaimerParagraphs } from '@/lib/legal'

export function FooterMlsGridDisclaimer() {
  const pathname = usePathname()
  if (pathname !== '/') return null
  const disclaimer = buildDisclaimerParagraphs()
  return (
    <Container className="pb-10 pt-4 text-center text-[13px] leading-[1.7] text-site-text-muted">
      <p className="mx-auto max-w-4xl">{disclaimer.mlsGrid}</p>
      <p className="mt-6 font-semibold text-site-text">{disclaimer.brokerage}</p>
      <p className="mt-1 text-site-text">{disclaimer.copyright}</p>
    </Container>
  )
}
