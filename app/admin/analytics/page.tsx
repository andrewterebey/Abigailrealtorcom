import { provider } from '@/lib/idx'
import { BLOG_POSTS } from '@/lib/blog'
import testimonialsData from '@/content/testimonials.json'

export const metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

/**
 * Analytics — clones LP's reporting layout (period toggle, stat tiles, chart
 * cards). ROUGH DRAFT: traffic metrics need an analytics provider (Plausible
 * is still a placeholder site-wide), so tiles show internal counts and the
 * charts are empty frames, clearly labeled.
 */
export default async function AdminAnalyticsPage() {
  const [active, sold] = await Promise.all([
    provider.list({ status: 'for-sale' }, { limit: 1, offset: 0 }),
    provider.list({ status: 'sold' }, { limit: 1, offset: 0 }),
  ])

  const tiles = [
    { label: 'Active listings', sub: 'Currently on the site', value: active.total.toLocaleString('en-US') },
    { label: 'Sold listings', sub: 'Shown in sold searches', value: sold.total.toLocaleString('en-US') },
    { label: 'Blog posts', sub: 'Published on /blog', value: String(BLOG_POSTS.length) },
    { label: 'Testimonials', sub: 'Published on /testimonials', value: String(testimonialsData.testimonials.length) },
  ]

  const gridLines = [0, 1, 2, 3, 4]

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Analytics</h1>
        <div className="flex rounded-full bg-[#f2f2f3] p-1 text-[13px]">
          {['Weekly', 'Monthly', 'Quarterly'].map((period, i) => (
            <span
              key={period}
              className={`rounded-full px-4 py-1.5 ${
                i === 1 ? 'bg-white font-medium shadow-sm' : 'text-gray-500'
              }`}
            >
              {period}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 max-w-xl text-[13px] leading-5 text-gray-500">
        Traffic and engagement metrics appear here once an analytics provider
        is wired up (planned: Plausible). The tiles below are live counts from
        the site&apos;s own data.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-gray-200 p-4">
            <div className="text-[13px] font-semibold">{t.label}</div>
            <div className="mt-0.5 text-xs text-gray-400">{t.sub}</div>
            <div className="mt-3 text-3xl font-semibold">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {['Visitors over time', 'Leads over time'].map((title) => (
          <div key={title} className="rounded-xl border border-gray-200 p-5">
            <h2 className="text-[13px] font-semibold">{title}</h2>
            <div className="relative mt-6">
              {gridLines.map((line) => (
                <div key={line} className="flex items-center gap-3 pb-9">
                  <span className="w-8 text-right text-[11px] text-gray-400">
                    {(4 - line) * 25}
                  </span>
                  <span className="h-px grow bg-gray-100" aria-hidden />
                </div>
              ))}
              <span className="absolute inset-0 flex items-center justify-center pl-11 text-[13px] text-gray-400">
                No analytics source connected
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
