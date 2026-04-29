'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Container } from './container'

// Routes whose top edge has no hero behind the header — they need the
// solid-white treatment from y=0 instead of transparent-over-image.
const ALWAYS_SOLID_ROUTES: ReadonlyArray<string | RegExp> = [
  '/home-search/listings',
]

const INLINE_LINKS = [
  { label: 'About Abigail', href: '/about' },
  { label: 'Home Search', href: '/home-search/listings' },
  { label: 'Home Valuation', href: '/home-valuation' },
] as const

const MENU_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Properties', href: '/properties' },
  { label: 'Home Search', href: '/home-search/listings' },
  { label: 'Home Valuation', href: '/home-valuation' },
  { label: 'Neighborhoods', href: '/neighborhoods' },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'Blog', href: '/blog' },
] as const

const RESOURCE_LINKS = [
  { label: 'About Abigail', href: '/about' },
  { label: 'Buyers', href: '/buyers' },
  { label: 'Sellers', href: '/sellers' },
  { label: 'Options', href: '/options' },
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [visible, setVisible] = useState(true)
  const lastYRef = useRef(0)
  const pathname = usePathname()
  const forceSolid = ALWAYS_SOLID_ROUTES.some((r) =>
    typeof r === 'string' ? r === pathname : r.test(pathname ?? ''),
  )

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      // Hide when scrolling down past ~120px; show on any upward scroll.
      const delta = y - lastYRef.current
      if (y < 120) setVisible(true)
      else if (delta > 6) setVisible(false)
      else if (delta < -6) setVisible(true)
      lastYRef.current = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Keep page scroll + pointer events enabled while the popout is open so
  // the user can still read and interact with the underlying page. Escape
  // still closes; the X button closes; clicking outside does not.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const base =
    'fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow,color] duration-300 ease-out'
  const isSolid = scrolled || forceSolid
  const bg = isSolid
    ? 'border-b border-black/5 bg-white text-site-text shadow-sm'
    : 'bg-transparent text-white'
  // While the side panel is open, force the header to stay put. Because
  // the popout is a fixed-position child of `<header>`, translating the
  // header also translates the panel — we don't want that to happen
  // mid-scroll while the menu is open.
  const hidden = visible || open ? 'translate-y-0' : '-translate-y-full'

  const close = () => {
    setOpen(false)
    setResourcesOpen(false)
  }

  return (
    <header className={`${base} ${bg} ${hidden}`}>
      {/* Dark gradient backing for the transparent state so the white logo
          + nav text stay legible even when the hero behind them is light
          (e.g. the peach sunrise on Home). Fades out as you scroll into the
          solid-white scrolled state. */}
      {!isSolid ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/25 to-transparent"
        />
      ) : null}
      <Container className="relative flex items-center py-3 lg:py-4">
        <Link
          href="/"
          aria-label="Abigail Anderson — home"
          className="block shrink-0"
        >
          <Image
            src={
              isSolid
                ? '/images/home-nav-logo.jpg'
                : '/images/home-nav-logo.png'
            }
            alt="John L. Scott — Abigail Anderson"
            width={347}
            height={100}
            priority
            className={
              isSolid ? 'h-12 w-auto lg:h-14' : 'h-12 w-auto lg:h-16'
            }
          />
        </Link>

        {/* Centered primary nav — fills the space between logo and the
            hamburger so it sits visually centered in the bar like live. */}
        <nav
          aria-label="Primary quick links"
          className="hidden flex-1 items-center justify-center gap-10 lg:flex"
        >
          {INLINE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-body text-[14px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-80 ${
                isSolid ? 'text-site-text' : 'text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className={`font-body text-[14px] font-bold uppercase tracking-[0.14em] transition-opacity hover:opacity-80 ${
              isSolid ? 'text-site-text' : 'text-white'
            }`}
          >
            Let&apos;s Connect
          </Link>
        </nav>

        {/* Mobile + tablet: nav collapses, hamburger sits at far right;
            desktop: hamburger after the centered nav. */}
        <div className="ml-auto lg:ml-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="site-menu-popout"
            className={`p-1 transition-colors ${
              isSolid ? 'text-site-text' : 'text-white'
            }`}
          >
            <Menu className="size-7" strokeWidth={1.5} />
          </button>
        </div>
      </Container>

      {/* Popout panel — slides in from the right. No backdrop: the rest of
          the page stays scrollable and clickable while the menu is open. */}
      <div
        id="site-menu-popout"
        role="region"
        aria-label="Site navigation"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-[420px] flex-col bg-white text-site-text shadow-2xl transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-site-text-muted">
            Menu
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            tabIndex={open ? 0 : -1}
            className="p-2 text-site-text transition-colors hover:text-site-gold"
          >
            <X className="size-6" />
          </button>
        </div>

        <nav aria-label="Site" className="flex-1 overflow-y-auto py-6">
          <ul className="flex flex-col">
            {MENU_LINKS.map((link) => (
              <li key={link.href} className="border-b border-black/10">
                <Link
                  href={link.href}
                  onClick={close}
                  tabIndex={open ? 0 : -1}
                  className="block px-6 py-5 text-center font-display text-[22px] uppercase tracking-[0.04em] text-site-text transition-colors hover:text-site-gold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="border-b border-black/10">
              <button
                type="button"
                onClick={() => setResourcesOpen((v) => !v)}
                aria-expanded={resourcesOpen}
                tabIndex={open ? 0 : -1}
                className="flex w-full items-center justify-center gap-2 px-6 py-5 font-display text-[22px] uppercase tracking-[0.04em] text-site-text transition-colors hover:text-site-gold"
              >
                Resources
                <ChevronDown
                  className={`size-5 transition-transform ${
                    resourcesOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {resourcesOpen && (
                <ul className="bg-black/[0.03] pb-2">
                  {RESOURCE_LINKS.map((r) => (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        onClick={close}
                        tabIndex={open ? 0 : -1}
                        className="block px-6 py-3 text-center font-body text-[13px] font-bold uppercase tracking-[0.18em] text-site-text transition-colors hover:text-site-gold"
                      >
                        {r.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            <li className="border-b border-black/10">
              <Link
                href="/contact"
                onClick={close}
                tabIndex={open ? 0 : -1}
                className="block px-6 py-5 text-center font-display text-[22px] uppercase tracking-[0.04em] text-site-text transition-colors hover:text-site-gold"
              >
                Let&apos;s Connect
              </Link>
            </li>
            <li className="border-b border-black/10">
              <Link
                href="/home-search/listings"
                onClick={close}
                tabIndex={open ? 0 : -1}
                className="block px-6 py-5 text-center font-display text-[22px] uppercase tracking-[0.04em] text-site-text transition-colors hover:text-site-gold"
              >
                My Search Portal
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
