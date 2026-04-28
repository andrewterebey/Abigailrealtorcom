import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/site/container'
import { BLOG_POSTS, getAllPostMeta, getPost, type Block } from '@/lib/blog'

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Post not found' }
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      images: post.image ? [post.image] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.image
      ? [`https://abigailrealtor.com${post.image}`]
      : undefined,
    author: {
      '@type': 'Person',
      name: 'Abigail Anderson',
      url: 'https://abigailrealtor.com/about',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Abigail Anderson — John L. Scott Real Estate',
    },
    datePublished: post.date,
    mainEntityOfPage: `https://abigailrealtor.com/blog/${post.slug}`,
  }

  return (
    <main>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        <header
          aria-label="Post hero"
          className="relative flex h-[480px] items-center justify-center overflow-hidden text-white md:h-[560px] lg:h-[640px]"
        >
          <Image
            src={post.image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/45" aria-hidden />
          <Container className="relative z-10 flex flex-col items-center pt-12 text-center">
            <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
              Blog
            </p>
            <h1 className="mt-4 max-w-4xl text-[32px] leading-[1.15] text-white sm:text-[44px] md:text-[52px] lg:text-[60px]">
              {post.title}
            </h1>
            {post.date && (
              <p className="mt-4 font-body text-[13px] uppercase tracking-[0.15em] text-white/80">
                {post.date}
              </p>
            )}
          </Container>
        </header>

        <section aria-label="Post body" className="py-16 md:py-20 lg:py-24">
          <Container>
            <div className="mx-auto max-w-prose">
              {post.blocks.map((block, i) => (
                <PostBlock key={i} block={block} />
              ))}

              <SocialShareRow title={post.title} slug={post.slug} />

              <p className="mt-12">
                <Link
                  href="/blog"
                  className="inline-block font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold transition-colors hover:text-site-gold-dim"
                >
                  ← Back to blog
                </Link>
              </p>
            </div>
          </Container>
        </section>
      </article>

      {/* Related posts band — matches the live "READ MORE ARTICLES" tray. */}
      <ReadMoreArticles currentSlug={post.slug} />
    </main>
  )
}

function ReadMoreArticles({ currentSlug }: { currentSlug: string }) {
  const related = getAllPostMeta()
    .filter((p) => p.slug !== currentSlug)
    .slice(0, 3)
  if (related.length === 0) return null
  return (
    <section
      aria-label="Read more articles"
      className="bg-black py-16 text-white md:py-20 lg:py-24"
    >
      <Container>
        <h2 className="text-center text-[28px] leading-[1.2] text-white md:text-[34px] lg:text-[40px]">
          Read More Articles
        </h2>
        <ul className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {related.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group relative block aspect-[4/3] overflow-hidden text-white"
              >
                <Image
                  src={post.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/50 transition-colors group-hover:bg-black/60" />
                <div className="absolute inset-0 flex items-end p-6">
                  <span className="font-display text-[16px] uppercase leading-[1.3] tracking-[0.04em] md:text-[18px]">
                    {post.title}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex justify-center">
          <Link
            href="/blog"
            className="inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
          >
            View All
          </Link>
        </div>
      </Container>
    </section>
  )
}

function SocialShareRow({ title, slug }: { title: string; slug: string }) {
  // Live shows 4 circular amber pills with FB/X/Pinterest/LinkedIn icons under
  // the body. We render the same affordance with real share intents — the
  // canonical URL is the live host since that's where the post will live in
  // production.
  const url = `https://abigailrealtor.com/blog/${slug}`
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  const shares = [
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      path: 'M13.5 21v-7.3h2.5l.4-2.9h-2.9V8.9c0-.8.3-1.4 1.5-1.4H16.5V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2H7.8v2.9h2.5V21h3.2Z',
    },
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      path: 'M3 3h4.6l4.5 6.5L17 3h2L13 11l7 10h-4.6l-4.7-6.7L5 21H3l7-9L3 3Z',
    },
    {
      label: 'Share on Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`,
      path: 'M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.5s-.3-.6-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.6-.3 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.5-1.8-4.2-4.3-4.2-2.9 0-4.6 2.2-4.6 4.4 0 .9.3 1.8.7 2.3l.2.3-.4 1.5c-.1.2-.3.3-.5.2-1.4-.7-2.2-2.7-2.2-4.3 0-3.5 2.5-6.7 7.3-6.7 3.8 0 6.8 2.7 6.8 6.4 0 3.8-2.4 6.9-5.7 6.9-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.2.9-.9 2.1-1.4 2.8A10 10 0 1 0 12 2Z',
    },
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      path: 'M5 4.5A1.5 1.5 0 1 1 5 7.5 1.5 1.5 0 0 1 5 4.5ZM3.5 9h3v11h-3V9Zm5 0h2.9v1.5h.04c.4-.7 1.4-1.5 2.96-1.5 3.16 0 3.6 2 3.6 4.6V20h-3v-5.6c0-1.4 0-3-1.85-3s-2.15 1.4-2.15 2.85V20h-3V9Z',
    },
  ]
  return (
    <div className="mt-12 flex items-center gap-3">
      <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-site-text-muted">
        Share
      </span>
      {shares.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          aria-label={s.label}
          className="flex size-9 items-center justify-center rounded-full bg-site-gold text-white transition-colors hover:bg-site-gold-dim"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            className="size-[14px]"
          >
            <path d={s.path} />
          </svg>
        </a>
      ))}
    </div>
  )
}

function PostBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case 'h2':
      return (
        <h2 className="mt-12 text-[26px] uppercase leading-[1.3] tracking-[0.04em] text-site-gold md:text-[30px]">
          {block.text}
        </h2>
      )
    case 'h3':
      return (
        <h3 className="mt-10 text-[20px] uppercase leading-[1.3] tracking-[0.04em] text-black md:text-[22px]">
          {block.text}
        </h3>
      )
    case 'ul':
      return (
        <ul className="mt-6 list-disc space-y-2 pl-6 font-body text-[16px] leading-[1.7] text-site-text">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'p':
    default:
      return (
        <p className="mt-6 font-body text-[16px] leading-[1.7] text-site-text">
          {block.text}
        </p>
      )
  }
}
