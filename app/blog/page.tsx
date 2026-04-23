import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Newsletter } from '@/components/home/newsletter'
import { Container } from '@/components/site/container'
import { getAllPostMeta } from '@/lib/blog'

const META_TITLE = 'Bellevue, WA Real Estate Blog'
const META_DESCRIPTION =
  "Gain more insights about the real estate industry in the Washington area by browsing Abigail Anderson's blog posts. Everything you need to know is here!"
const META_IMAGE = '/images/blog-background.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [{ url: META_IMAGE, width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [META_IMAGE],
  },
}

export default function BlogIndexPage() {
  const posts = getAllPostMeta()

  return (
    <main>
      <section
        aria-label="Blog hero"
        className="relative flex h-[420px] items-center justify-center overflow-hidden text-white md:h-[520px]"
      >
        <Image
          src="/images/blog-background.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" aria-hidden />
        <Container className="relative z-10 flex flex-col items-center pt-12 text-center">
          <h1 className="text-[44px] leading-[1.1] text-white sm:text-[60px] lg:text-[70px]">
            Blog
          </h1>
        </Container>
      </section>

      <section aria-label="Blog posts" className="py-16 md:py-20 lg:py-24">
        <Container>
          <ul className="grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-2 md:gap-y-16 lg:gap-x-12">
            {posts.map((post) => (
              <li key={post.slug}>
                <article className="flex flex-col">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block overflow-hidden"
                    aria-label={post.title}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <Image
                        src={post.image}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 45vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  </Link>
                  <div className="pt-6">
                    <h2 className="font-display text-[21px] uppercase leading-[1.3] tracking-[0.04em] text-black md:text-[22px]">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="transition-colors hover:text-site-gold"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <hr className="mt-4 w-full border-t border-black/15" />
                    <p className="mt-5 font-body text-[15px] leading-[1.7] text-site-text md:text-[16px]">
                      {post.teaser}
                    </p>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-6 inline-block font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold transition-colors hover:text-site-gold-dim"
                    >
                      Read More
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Live footer-band is the newsletter signup, not the Ready-to-Begin CTA. */}
      <Newsletter
        title="Receive Exclusive Listings In Your Inbox"
        description="Are you interested in buying a home? Look no further than working with a real estate expert."
      />
    </main>
  )
}
