import type { MetadataRoute } from 'next'

/**
 * Next 15 generates `/robots.txt` from this module. See CLAUDE.md §10 —
 * "`robots.txt` allowing all".
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://abigailrealtor.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
