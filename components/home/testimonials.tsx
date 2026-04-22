'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Container } from '@/components/site/container'
import testimonialsData from '@/content/testimonials.json'

type Testimonial = {
  id: string
  author: string
  quote: string
}

const TESTIMONIALS: Testimonial[] = testimonialsData.testimonials

export function Testimonials() {
  const [index, setIndex] = useState(0)
  const current = TESTIMONIALS[index]

  const prev = () =>
    setIndex((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setIndex((i) => (i + 1) % TESTIMONIALS.length)

  return (
    <section
      aria-label="What clients are saying"
      className="py-16 md:py-20 lg:py-24"
    >
      <Container className="text-center">
        <h2 className="text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
          What Clients Are Saying
        </h2>

        <div className="mx-auto mt-6 max-w-3xl">
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={prev}
              className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text transition-colors hover:text-site-gold"
            >
              Previous
            </button>
            <span aria-hidden className="text-site-text-muted/40">
              |
            </span>
            <button
              type="button"
              onClick={next}
              className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text transition-colors hover:text-site-gold"
            >
              Next
            </button>
          </div>

          <blockquote className="mt-8">
            <p className="font-body text-[15px] leading-[1.8] text-site-text md:text-[16px]">
              {current.quote}
            </p>
            <footer className="mt-6 font-body text-[14px] font-semibold uppercase tracking-[0.14em] text-site-gold">
              — {current.author}
            </footer>
          </blockquote>

          <div
            className="mt-8 flex justify-center gap-2"
            role="tablist"
            aria-label="Testimonial navigation"
          >
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Testimonial ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === index
                    ? 'bg-site-gold'
                    : 'bg-site-text-muted/40 hover:bg-site-gold/60'
                }`}
              />
            ))}
          </div>
        </div>

        <Link
          href="/testimonials"
          className="mt-10 inline-flex items-center justify-center bg-site-gold px-10 py-[18px] font-body text-[14px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-site-gold-dim"
        >
          View All
        </Link>
      </Container>
    </section>
  )
}
