import type { MetadataRoute } from 'next'
import { BLOG_POSTS } from '@/lib/blog'
import { NEIGHBORHOOD_SLUGS } from '@/lib/neighborhoods'
import { provider as idxProvider } from '@/lib/idx'

/**
 * Build-time sitemap generator. Next 15 renders `/sitemap.xml` from this
 * module. See CLAUDE.md §10 — SEO is non-negotiable on a realtor site.
 *
 * - Base URL is taken from `NEXT_PUBLIC_SITE_URL` so a preview deploy gets
 *   its own sitemap; falls back to the production domain.
 * - Property slugs are pulled from the IDX provider directly. This file is
 *   server-only and runs at build time, so calling `provider.list()` here is
 *   safe and keeps the sitemap in sync with whatever provider ships.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://abigailrealtor.com'
  const now = new Date()

  const url = (path: string) => `${baseUrl}${path}`

  // --- Top-level pages (CLAUDE.md §8) -------------------------------------
  const topLevel: MetadataRoute.Sitemap = [
    {
      url: url('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: url('/about'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: url('/properties'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: url('/home-search'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: url('/home-valuation'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: url('/testimonials'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: url('/buyers'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: url('/sellers'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: url('/options'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: url('/blog'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: url('/contact'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]

  // --- Neighborhoods (index already above; here: 6 detail pages) ----------
  const neighborhoodsIndex: MetadataRoute.Sitemap = [
    {
      url: url('/neighborhoods'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
  const neighborhoodDetails: MetadataRoute.Sitemap = NEIGHBORHOOD_SLUGS.map(
    (slug) => ({
      url: url(`/neighborhoods/${slug}`),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }),
  )

  // --- Blog posts (read slugs from BLOG_POSTS — source of truth) ----------
  const blogPosts: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url: url(`/blog/${p.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  // --- Property detail pages (IDX provider) -------------------------------
  // `limit: 50` is the provider max; we have 12 placeholder listings so this
  // fetches them all. If the feed ever grows past 50, this will need to
  // paginate — tracked in TODO.md if/when that happens.
  const properties: MetadataRoute.Sitemap = []
  try {
    const { items } = await idxProvider.list({}, { limit: 50, offset: 0 })
    for (const l of items) {
      properties.push({
        url: url(`/properties/${l.slug}`),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.6,
      })
    }
  } catch (err) {
    // Don't fail the build if the provider is down — just emit the rest of
    // the sitemap. Log so it shows up in the build output.
    console.error('[sitemap] failed to list properties:', err)
  }

  // --- Legal --------------------------------------------------------------
  const legal: MetadataRoute.Sitemap = [
    {
      url: url('/dmca-notice'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: url('/terms-and-conditions'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: url('/privacy-policy'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  return [
    ...topLevel,
    ...neighborhoodsIndex,
    ...neighborhoodDetails,
    ...blogPosts,
    ...properties,
    ...legal,
  ]
}
