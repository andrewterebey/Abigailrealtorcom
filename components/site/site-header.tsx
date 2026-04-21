'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Container } from './container'

const NAV_LINKS = [
  { label: 'About Abigail', href: '/about' },
  { label: 'Home Search', href: '/home-search/listings' },
  { label: 'Home Valuation', href: '/home-valuation' },
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="absolute inset-x-0 top-0 z-50 text-white">
      <Container className="flex items-center justify-between py-5 lg:py-7">
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
            className="h-10 w-auto lg:h-12"
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
              className="font-body text-[14px] font-normal uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="rounded-full border border-white/20 bg-site-gold px-6 py-2 font-display text-[10px] uppercase tracking-[0.04em] text-white transition-colors hover:bg-site-gold-dim"
          >
            Let&apos;s Connect
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 lg:hidden"
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
