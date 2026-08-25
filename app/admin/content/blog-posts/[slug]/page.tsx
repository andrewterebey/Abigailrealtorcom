import { readFile } from 'node:fs/promises'
import path from 'node:path'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ChevronDown, ExternalLink } from 'lucide-react'
import { BLOG_POSTS } from '@/lib/blog'

export const metadata = { title: 'Edit Post' }

/**
 * Edit Post screen — clones LP's editor layout (top action bar, Post
 * Details/SEO side-tabs, field column, image panel). ROUGH DRAFT: fields are
 * prefilled from the repo's content but nothing persists; Publish is disabled
 * until the Supabase phase. The body is raw markdown by design (approved:
 * markdown + preview over a WYSIWYG for v1).
 */
export default async function AdminEditBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = BLOG_POSTS.find((p) => p.slug === slug)
  if (!post) notFound()

  const body = await readFile(
    path.join(process.cwd(), 'content', 'blog', post.file),
    'utf8',
  )

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/content/blog-posts"
            aria-label="Back to blog posts"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <span className="text-[15px] font-semibold">Edit Post</span>
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 font-medium text-gray-700 hover:text-gray-900"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Preview
          </Link>
          <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Published <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </span>
          <Link
            href="/admin/content/blog-posts"
            className="rounded-lg border border-gray-300 px-4 py-1.5 font-medium hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            title="Saving lands with the Supabase phase"
            className="cursor-not-allowed rounded-lg bg-black px-4 py-1.5 font-medium text-white opacity-90"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="flex grow">
        <nav className="w-44 shrink-0 border-r border-gray-100 px-3 py-5 text-[13px]">
          <div className="rounded-lg bg-[#f2f2f3] px-3 py-2 font-medium">
            Post Details
          </div>
          <div className="px-3 py-2 text-gray-600">SEO</div>
        </nav>

        <div className="grid grow gap-10 px-8 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h2 className="text-[15px] font-semibold">Post Details</h2>

            <label className="mt-5 block text-[13px] font-medium">
              Title*
              <input
                type="text"
                defaultValue={post.title}
                className="mt-1.5 w-full rounded-lg bg-[#f2f2f3] px-3 py-2.5 text-[13px] outline-none"
              />
            </label>

            <label className="mt-4 block text-[13px] font-medium">
              Subtitle
              <input
                type="text"
                defaultValue={post.teaser}
                className="mt-1.5 w-full rounded-lg bg-[#f2f2f3] px-3 py-2.5 text-[13px] outline-none"
              />
            </label>

            <label className="mt-4 block text-[13px] font-medium">
              Publishing Date
              <input
                type="text"
                defaultValue={post.date}
                className="mt-1.5 w-full rounded-lg bg-[#f2f2f3] px-3 py-2.5 text-[13px] outline-none"
              />
            </label>

            <label className="mt-4 block text-[13px] font-medium">
              Author
              <input
                type="text"
                defaultValue="Abigail Anderson"
                className="mt-1.5 w-full rounded-lg bg-[#f2f2f3] px-3 py-2.5 text-[13px] outline-none"
              />
            </label>

            <label className="mt-5 flex items-center gap-2 text-[13px] font-medium">
              <input type="checkbox" disabled /> Featured
            </label>

            <label className="mt-8 block text-[13px] font-medium">
              Post Body* <span className="font-normal text-gray-400">(markdown)</span>
              <textarea
                defaultValue={body}
                rows={24}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-xs leading-5 outline-none"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">Images</h2>
              <button
                type="button"
                title="Image upload lands with the Supabase phase"
                className="cursor-not-allowed text-[13px] text-gray-400"
              >
                Upload Images
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
              <Image
                src={post.image}
                alt={post.title}
                width={360}
                height={220}
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
