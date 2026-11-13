'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, Search } from 'lucide-react'

export type BlogPostRow = {
  slug: string
  title: string
  image: string
  /** MM/DD/YY from the repo's index. */
  date?: string
}

/** Formats the index's MM/DD/YY dates like LP's table ("Jul 31, 2025"). */
function formatDate(mmddyy?: string): string {
  if (!mmddyy) return '—'
  const [m, d, y] = mmddyy.split('/').map(Number)
  if (!m || !d || !y) return mmddyy
  return new Date(2000 + y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** LP-style posts table with a working title search. Rows open the editor. */
export function BlogPostsTable({ posts }: { posts: BlogPostRow[] }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = q ? posts.filter((p) => p.title.toLowerCase().includes(q)) : posts

  return (
    <>
      <div className="mt-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2 text-gray-400">
          <Search className="h-4 w-4" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            aria-label="Search posts by title"
            className="w-64 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-6 text-[13px] text-gray-500">
          <span className="flex items-center gap-1.5">
            Order by:{' '}
            <span className="font-medium text-gray-900">Newest Created</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>

      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2.5 font-medium">Title</th>
            <th className="w-32 py-2.5 font-medium">Created</th>
            <th className="w-32 py-2.5 font-medium">Published</th>
            <th className="w-28 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((post) => (
            <tr key={post.slug} className="border-b border-gray-100">
              <td className="py-3">
                <Link
                  href={`/admin/content/blog-posts/${post.slug}`}
                  className="flex items-center gap-4 font-semibold text-gray-900 hover:underline"
                >
                  <Image
                    src={post.image}
                    alt=""
                    width={76}
                    height={48}
                    className="h-12 w-[76px] shrink-0 rounded object-cover"
                  />
                  {post.title}
                </Link>
              </td>
              <td className="py-3 text-gray-600">{formatDate(post.date)}</td>
              <td className="py-3 text-gray-600">{formatDate(post.date)}</td>
              <td className="py-3">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  Published
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-400">
                No posts match “{query}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="py-3 text-xs text-gray-400">
        {rows.length} of {posts.length} records
        {posts.length > 0 && ' · saving to the site lands with the Supabase phase'}
      </p>
    </>
  )
}
