import { notFound } from 'next/navigation'
import { getPostSource } from '@/lib/blog'
import { DEFAULT_AUTHOR, mmddyyToIso, type BlogDraft } from '@/lib/blog-draft'
import { BlogPostEditor } from '@/components/admin/blog-post-editor'

export const metadata = { title: 'Edit Post' }

/** Edit an existing post. Prefilled from the repo's content; see the editor
 *  component for what persists (browser-local drafts only, for now). */
export default async function AdminEditBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const source = await getPostSource(slug)
  if (!source) notFound()

  const initial: BlogDraft = {
    slug: source.meta.slug,
    title: source.meta.title,
    subtitle: source.meta.teaser,
    date: mmddyyToIso(source.meta.date),
    author: DEFAULT_AUTHOR,
    featured: false,
    body: source.body,
    image: source.meta.image,
    metaTitle: '',
    metaDescription: source.meta.description,
  }

  return <BlogPostEditor mode="edit" initial={initial} />
}
