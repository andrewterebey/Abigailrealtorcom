/**
 * JSON-LD builders for the home page. CLAUDE.md §10 marks
 * `RealEstateAgent` + `LocalBusiness` as non-negotiable for SEO on a
 * realtor site. Values come verbatim from CLAUDE.md §12 branding facts —
 * do not change without Abigail's confirmation.
 *
 * Outstanding placeholders (tracked in TODO.md):
 *   - `priceRange` is a best-guess `$$$` until she confirms.
 *   - `openingHours` is a `Mo-Fr 09:00-18:00` stub until she confirms.
 */

const SITE_URL = 'https://abigailrealtor.com'

const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '11040 Main St Suite 200',
  addressLocality: 'Bellevue',
  addressRegion: 'WA',
  postalCode: '98004',
  addressCountry: 'US',
} as const

const AGENT_IMAGE = `${SITE_URL}/images/home-portrait-main.jpg`
const AGENT_NAME = 'Abigail Anderson'
const BUSINESS_NAME = 'Abigail Anderson — John L. Scott Real Estate'
const TELEPHONE = '(425) 236-2853'
const EMAIL = 'abigaila@johnlscott.com'

export function realEstateAgentJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${SITE_URL}#realestateagent`,
    name: AGENT_NAME,
    image: AGENT_IMAGE,
    url: SITE_URL,
    telephone: TELEPHONE,
    email: EMAIL,
    address: ADDRESS,
    worksFor: {
      '@type': 'Organization',
      name: 'John L. Scott Real Estate',
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'King County, WA',
    },
  }
}

export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}#localbusiness`,
    name: BUSINESS_NAME,
    image: AGENT_IMAGE,
    url: SITE_URL,
    telephone: TELEPHONE,
    email: EMAIL,
    address: ADDRESS,
    // Placeholder — confirm with Abigail before go-live (see TODO.md).
    priceRange: '$$$',
    // Placeholder — confirm with Abigail before go-live (see TODO.md).
    openingHours: 'Mo-Fr 09:00-18:00',
  }
}
