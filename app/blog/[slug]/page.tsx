import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ContactCta } from '@/components/home/contact-cta'
import { Container } from '@/components/site/container'
import { BLOG_POSTS, getPost, type Block } from '@/lib/blog'

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

              <p className="mt-16">
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

      <ContactCta />
    </main>
  )
}

function PostBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case 'h2':
      return (
        <h2 className="mt-12 text-[26px] uppercase leading-[1.3] tracking-[0.04em] text-black md:text-[30px]">
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
