import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/blog'
import { BlogPostsTable } from '@/components/admin/blog-posts-table'

export const metadata = { title: 'Blog Posts' }

export default function AdminBlogPostsPage() {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Blog Posts</h1>
        <Link
          href="/admin/content/blog-posts/new"
          className="rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-800"
        >
          Add New
        </Link>
      </div>
      <BlogPostsTable
        posts={BLOG_POSTS.map((p) => ({
          slug: p.slug,
          title: p.title,
          image: p.image,
          date: p.date,
        }))}
      />
    </div>
  )
}
