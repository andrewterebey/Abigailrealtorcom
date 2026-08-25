import Link from 'next/link'
import { provider } from '@/lib/idx'
import { BLOG_POSTS } from '@/lib/blog'
import testimonialsData from '@/content/testimonials.json'

export const dynamic = 'force-dynamic'

/** Admin home — copies the LP dashboard's welcome + explore-cards layout,
 *  with live counts from the site's own data in place of LP's promo card. */
export default async function AdminDashboardPage() {
  const [active, sold] = await Promise.all([
    provider.list({ status: 'for-sale' }, { limit: 1, offset: 0 }),
    provider.list({ status: 'sold' }, { limit: 1, offset: 0 }),
  ])

  const stats = [
    { label: 'Active listings', value: active.total.toLocaleString('en-US'), href: '/admin/listings' },
    { label: 'Sold listings', value: sold.total.toLocaleString('en-US'), href: '/admin/listings' },
    { label: 'Blog posts', value: String(BLOG_POSTS.length), href: '/admin/content/blog-posts' },
    { label: 'Testimonials', value: String(testimonialsData.testimonials.length), href: '/admin/content/testimonials' },
    { label: 'New leads', value: '—', href: '/admin/contacts' },
  ]

  const explore = [
    {
      title: 'Content',
      body: 'Edit blog posts and testimonials shown on the site.',
      href: '/admin/content/blog-posts',
      cta: 'Open',
    },
    {
      title: 'Contacts',
      body: 'Contact-form submissions land here once storage is wired.',
      href: '/admin/contacts',
      cta: 'View',
    },
    {
      title: 'Listings',
      body: 'Browse the MLS feed and check the last sync.',
      href: '/admin/listings',
      cta: 'Browse',
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-8 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome back, Abigail
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Here&apos;s what&apos;s happening on abigailrealtor.com.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-gray-200 p-4 hover:border-gray-300"
          >
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="mt-1 text-xs text-gray-500">{s.label}</div>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 mb-4 text-sm font-medium text-gray-700">
        Start exploring
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {explore.map((c) => (
          <div
            key={c.title}
            className="flex flex-col rounded-xl border border-gray-200 p-5"
          >
            <h3 className="font-medium">{c.title}</h3>
            <p className="mt-1.5 grow text-[13px] leading-5 text-gray-500">
              {c.body}
            </p>
            <Link
              href={c.href}
              className="mt-4 inline-flex w-fit rounded-lg border border-gray-300 px-3.5 py-1.5 text-[13px] font-medium hover:bg-gray-50"
            >
              {c.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
