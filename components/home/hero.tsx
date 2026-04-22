'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Container } from '@/components/site/container'

type Mode = 'buy' | 'rent'

export function Hero() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('buy')
  const [q, setQ] = useState('')

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (mode === 'rent') params.set('mode', 'rent')
    router.push(`/home-search/listings${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <section
      aria-label="Hero"
      className="relative h-screen min-h-[600px] w-full overflow-hidden text-white"
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/videos/home-hero-poster.jpg"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/videos/home-hero.webm" type="video/webm" />
        <source src="/videos/home-hero.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/30" aria-hidden />

      <div className="relative z-10 flex h-full items-center justify-center">
        <Container className="flex flex-col items-center text-center">
          <h1 className="whitespace-nowrap text-[34px] leading-[1.1] sm:text-[60px] lg:text-[70px]">
            Abigail Anderson
          </h1>
          <p className="mt-4 font-body text-[14px] font-bold uppercase tracking-[0.14em]">
            King County Real Estate Expert
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-10 w-full max-w-2xl"
            role="search"
            aria-label="Property search"
          >
            {/* BUY/RENT toggles — small pill buttons, gold tint when inactive,
                opaque white when active, sitting flush above the input row. */}
            <div className="mb-3 flex justify-center" role="tablist">
              {(['buy', 'rent'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`min-w-[80px] px-6 py-2 font-body text-[13px] font-bold uppercase tracking-[0.14em] transition-colors ${
                    mode === m
                      ? 'bg-white text-black'
                      : 'bg-site-gold/80 text-white hover:bg-site-gold'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Stacks on mobile (matches live: input row, then full-width
                Search button beneath) and goes side-by-side from sm up. */}
            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              <label htmlFor="hero-search" className="sr-only">
                Search by address, city, or neighborhood
              </label>
              <div className="flex flex-1 items-center bg-white px-4">
                <Search className="size-4 text-site-text-muted" aria-hidden />
                <input
                  id="hero-search"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by Address, City, or Neighborhood"
                  className="ml-2 min-w-0 flex-1 bg-transparent py-3 text-[14px] text-site-text placeholder:text-site-text-muted focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="border border-white/70 bg-transparent px-10 py-3 font-body text-[14px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/10"
              >
                Search
              </button>
            </div>
          </form>
        </Container>
      </div>
    </section>
  )
}
