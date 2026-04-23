import Image from 'next/image'
import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
import { Container } from './container'
import { FooterMlsGridDisclaimer } from './footer-mls-grid'
import { buildDisclaimerParagraphs } from '@/lib/legal'

const CONTACT = {
  name: 'Abigail Anderson',
  email: 'abigaila@johnlscott.com',
  phone: '(425) 236-2853',
  addressLine1: '11040 Main St Suite 200',
  addressLine2: 'Bellevue, WA 98004',
} as const

const SOCIALS = [
  { label: 'Facebook', href: '#', Icon: FacebookIcon },
  { label: 'Instagram', href: '#', Icon: InstagramIcon },
  { label: 'LinkedIn', href: '#', Icon: LinkedInIcon },
  { label: 'TikTok', href: '#', Icon: TikTokIcon },
] as const

export function SiteFooter() {
  const disclaimer = buildDisclaimerParagraphs()
  const currentYear = new Date().getUTCFullYear()

  return (
    <footer className="bg-white text-site-text">
      <Container className="py-16 lg:py-20">
        <h4 className="text-[22px] tracking-[0.06em] md:text-[24px]">
          {CONTACT.name}
        </h4>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-10">
            <ContactItem
              icon={<Mail className="size-[22px]" strokeWidth={1.4} />}
              label="Email"
            >
              <a
                href={`mailto:${CONTACT.email}`}
                className="font-body text-[14px] font-semibold uppercase tracking-[0.08em] underline underline-offset-[6px] hover:text-site-gold"
              >
                {CONTACT.email}
              </a>
            </ContactItem>

            <ContactItem
              icon={<MapPin className="size-[22px]" strokeWidth={1.4} />}
              label="Address"
            >
              <address className="not-italic font-body text-[14px] font-semibold uppercase leading-[1.7] tracking-[0.08em]">
                {CONTACT.addressLine1}
                <br />
                {CONTACT.addressLine2}
              </address>
            </ContactItem>
          </div>

          <div className="lg:pl-8">
            <ContactItem
              icon={<Phone className="size-[22px]" strokeWidth={1.4} />}
              label="Phone Number"
            >
              <a
                href={`tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`}
                className="font-body text-[14px] font-semibold uppercase tracking-[0.08em] underline underline-offset-[6px] hover:text-site-gold"
              >
                {CONTACT.phone}
              </a>
            </ContactItem>
          </div>
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[auto_1fr] lg:gap-12">
          <Image
            src="/images/home-footer-image-footer-image.png"
            alt="John L. Scott Real Estate"
            width={560}
            height={171}
            className="h-16 w-auto lg:h-20"
          />

          <div className="space-y-5 text-[14px] leading-[1.7] text-site-text">
            <p>
              <Link
                href="/dmca-notice"
                className="font-body text-[14px] font-semibold text-site-text underline underline-offset-[6px] hover:text-site-gold"
              >
                DMCA Notice
              </Link>
            </p>
            <p>{disclaimer.reliability}</p>
            <p>{disclaimer.idx}</p>
            <p>{disclaimer.copyright}</p>

            <div className="flex items-center gap-4 pt-4">
              <RealtorBadge />
              <EqualHousingBadge />
            </div>
          </div>
        </div>

        <hr className="mt-16 border-t border-black/10" />

        <div className="mt-10 flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <p className="font-body text-[14px] leading-[1.6] text-site-text">
            Real Estate Website Design by{' '}
            <span className="font-semibold">{CONTACT.name}</span>
          </p>
          <p className="font-body text-[14px] leading-[1.6] text-site-text">
            Copyright © {currentYear} |{' '}
            <Link
              href="/privacy-policy"
              className="underline underline-offset-[6px] hover:text-site-gold"
            >
              Privacy Policy
            </Link>
          </p>
          <ul className="flex items-center gap-3">
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-full bg-site-gold text-white transition-colors hover:bg-site-gold-dim"
                >
                  <Icon className="size-[14px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <FooterMlsGridDisclaimer />
    </footer>
  )
}

function ContactItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-5">
      <span aria-hidden className="mt-[2px] shrink-0 text-site-text">
        {icon}
      </span>
      <div>
        <p className="font-body text-[12px] font-bold uppercase tracking-[0.22em] text-site-text">
          {label}
        </p>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

function RealtorBadge() {
  return (
    <span
      aria-label="Realtor"
      className="inline-flex h-10 w-8 items-center justify-center border border-black/80 text-[10px] font-bold uppercase tracking-wider text-black"
    >
      <span className="flex flex-col items-center leading-none">
        <span className="text-[16px] leading-none">R</span>
        <span className="text-[6px] leading-none">REALTOR®</span>
      </span>
    </span>
  )
}

function EqualHousingBadge() {
  return (
    <span
      aria-label="Equal Housing Opportunity"
      className="inline-flex h-10 items-center justify-center border border-black/80 px-2 text-center text-[6px] font-bold uppercase tracking-wider text-black"
    >
      <span className="flex flex-col items-center leading-none">
        <span className="text-[10px] leading-none">⌂</span>
        <span className="mt-0.5 leading-none">EQUAL HOUSING</span>
        <span className="leading-none">OPPORTUNITY</span>
      </span>
    </span>
  )
}

// Inline social SVGs — this lucide-react build doesn't include brand icons.
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M13.5 21v-7.3h2.5l.4-2.9h-2.9V8.9c0-.8.3-1.4 1.5-1.4H16.5V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2H7.8v2.9h2.5V21h3.2Z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M4.5 8.5h3v11h-3v-11Zm1.5-4.6a1.7 1.7 0 1 1 0 3.5 1.7 1.7 0 0 1 0-3.5ZM10 8.5h2.9v1.5h.1c.4-.7 1.4-1.5 2.9-1.5 3.1 0 3.6 2 3.6 4.5v6h-3v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.5h-3v-11Z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M19.6 7.4a6 6 0 0 1-3.5-1.1v7.8a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v2.7a2.8 2.8 0 1 0 1.9 2.7V2h2.6a3.4 3.4 0 0 0 3.6 3v2.4Z" />
    </svg>
  )
}
