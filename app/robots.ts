import type { MetadataRoute } from 'next'

/**
 * Next 15 generates `/robots.txt` from this module. See CLAUDE.md §10 —
 * "`robots.txt` allowing all".
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://abigailrealtor.com'

  // Staging/review deploys (e.g. the NWMLS demo-data site) set
  // NEXT_PUBLIC_NOINDEX=true so the in-progress site isn't publicly indexed
  // before launch / NWMLS approval.
  if (process.env.NEXT_PUBLIC_NOINDEX === 'true') {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

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
