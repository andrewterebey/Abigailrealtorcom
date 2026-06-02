'use client'

import { usePathname } from 'next/navigation'
import { Container } from './container'
import type { DisclaimerParagraphs } from '@/lib/legal'

export function FooterMlsGridDisclaimer({
  // Computed once on the server (SiteFooter) and passed down. Do NOT call
  // buildDisclaimerParagraphs() here: it embeds new Date() and this is a client
  // component, so a second call during hydration would render a different
  // {{TIME_UTC}} than the server baked into the HTML → hydration mismatch.
  disclaimer,
}: {
  disclaimer: DisclaimerParagraphs
}) {
  const pathname = usePathname()
  // NWMLS requires the timestamped "as of…" + consumer-use disclaimer on each
  // display of IDX listings ([GRID §24]). When the real feed is active
  // (NEXT_PUBLIC_IDX_NWMLS), show it site-wide; otherwise keep it home-only
  // (the placeholder state must not over-claim NWMLS on every page).
  const branded = process.env.NEXT_PUBLIC_IDX_NWMLS === 'true'
  if (!branded && pathname !== '/') return null
  return (
    <Container className="pb-10 pt-4 text-center text-[13px] leading-[1.7] text-site-text-muted">
      <p className="mx-auto max-w-4xl">{disclaimer.mlsGrid}</p>
      <p className="mt-6 font-semibold text-site-text">{disclaimer.brokerage}</p>
      <p className="mt-1 text-site-text">{disclaimer.copyright}</p>
    </Container>
  )
}
