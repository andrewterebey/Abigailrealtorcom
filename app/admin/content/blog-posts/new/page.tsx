import { emptyDraft, todayIso } from '@/lib/blog-draft'
import { BlogPostEditor } from '@/components/admin/blog-post-editor'

export const metadata = { title: 'New Post' }
export const dynamic = 'force-dynamic'

export default function AdminNewBlogPostPage() {
  return <BlogPostEditor mode="new" initial={emptyDraft(todayIso())} />
}
