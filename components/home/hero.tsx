'use client'

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
      className="relative h-[78vh] min-h-[560px] w-full overflow-hidden text-white"
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
          <h1 className="text-[44px] leading-[1.1] sm:text-[60px] lg:text-[70px]">
            Abigail Anderson
          </h1>
          <p className="mt-4 font-body text-[14px] font-bold uppercase tracking-[0.14em]">
            King County Real Estate Expert
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-10 w-full max-w-xl"
            role="search"
            aria-label="Property search"
          >
            <div className="mb-4 flex justify-center gap-2" role="tablist">
              {(['buy', 'rent'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`px-5 py-1.5 font-body text-[12px] font-bold uppercase tracking-[0.14em] transition-colors ${
                    mode === m
                      ? 'bg-white text-black'
                      : 'border border-white/40 text-white hover:bg-white/10'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-stretch border border-white/70 bg-black/20">
              <label htmlFor="hero-search" className="sr-only">
                Search by address, city, or neighborhood
              </label>
              <input
                id="hero-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by Address, City, or Neighborhood"
                className="flex-1 bg-transparent px-4 py-3 text-[14px] text-white placeholder:text-white/70 focus:outline-none"
              />
              <button
                type="submit"
                className="border-l border-white/70 px-8 py-3 font-body text-[14px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/10"
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
