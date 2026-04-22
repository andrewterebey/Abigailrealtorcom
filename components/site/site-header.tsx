'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Container } from './container'

const NAV_LINKS = [
  { label: 'About Abigail', href: '/about' },
  { label: 'Home Search', href: '/home-search/listings' },
  { label: 'Home Valuation', href: '/home-valuation' },
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const headerClasses = scrolled
    ? 'fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white text-site-text shadow-sm'
    : 'absolute inset-x-0 top-0 z-50 text-white'

  return (
    <header className={headerClasses}>
      <Container className="flex items-center justify-between py-4 lg:py-5">
        <Link
          href="/"
          aria-label="Abigail Anderson — home"
          className="block shrink-0"
        >
          <Image
            src="/images/home-nav-logo.png"
            alt="John L. Scott — Abigail Anderson"
            width={347}
            height={100}
            priority
            className={
              scrolled
                ? 'h-9 w-auto lg:h-10'
                : 'h-10 w-auto brightness-0 invert lg:h-12'
            }
          />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 lg:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-body text-[14px] font-normal uppercase tracking-[0.1em] transition-opacity hover:opacity-80 ${
                scrolled ? 'text-site-text' : 'text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="rounded-full bg-site-gold px-6 py-2 font-display text-[10px] uppercase tracking-[0.04em] text-white transition-colors hover:bg-site-gold-dim"
          >
            Let&apos;s Connect
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className={`p-2 lg:hidden ${scrolled ? 'text-site-text' : 'text-white'}`}
        >
          <Menu className="size-6" />
        </button>
      </Container>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/95 text-white lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <Container className="flex items-center justify-between py-5">
            <span className="sr-only">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="ml-auto p-2"
            >
              <X className="size-6" />
            </button>
          </Container>
          <nav
            aria-label="Mobile"
            className="flex flex-col items-center gap-8 pt-16"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-body text-[18px] font-normal uppercase tracking-[0.1em]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="rounded-full bg-site-gold px-8 py-3 font-display text-[14px] uppercase tracking-[0.04em]"
            >
              Let&apos;s Connect
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
