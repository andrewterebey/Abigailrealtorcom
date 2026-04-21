import Image from 'next/image'
import Link from 'next/link'
import { Container } from './container'
import { buildDisclaimerParagraphs } from '@/lib/legal'

const CONTACT = {
  name: 'Abigail Anderson',
  email: 'abigaila@johnlscott.com',
  phone: '(425) 236-2853',
  addressLine1: '11040 Main St Suite 200',
  addressLine2: 'Bellevue, WA 98004',
} as const

export function SiteFooter() {
  const disclaimer = buildDisclaimerParagraphs()
  const currentYear = new Date().getUTCFullYear()

  return (
    <footer className="border-t border-black/10 bg-white text-site-text">
      <Container className="py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr] lg:gap-12">
          <div>
            <h4 className="text-[21px]">{CONTACT.name}</h4>
          </div>

          <dl className="space-y-4 text-[14px]">
            <div>
              <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                Email
              </dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="hover:text-site-gold"
                >
                  {CONTACT.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                Phone Number
              </dt>
              <dd className="mt-1">
                <a
                  href={`tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`}
                  className="hover:text-site-gold"
                >
                  {CONTACT.phone}
                </a>
              </dd>
            </div>
          </dl>

          <div className="text-[14px]">
            <p className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
              Address
            </p>
            <address className="mt-1 not-italic">
              {CONTACT.addressLine1}
              <br />
              {CONTACT.addressLine2}
            </address>
          </div>
        </div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[auto_1fr] lg:gap-12">
          <Image
            src="/images/home-footer-image-footer-image.png"
            alt="John L. Scott Real Estate"
            width={560}
            height={171}
            className="h-14 w-auto lg:h-16"
          />

          <div className="space-y-4 text-[12px] leading-relaxed text-site-text-muted">
            <p>
              <Link
                href="/dmca-notice"
                className="font-semibold uppercase tracking-[0.1em] text-site-text hover:text-site-gold"
              >
                DMCA Notice
              </Link>
            </p>
            <p>{disclaimer.reliability}</p>
            <p>{disclaimer.idx}</p>
            <p className="font-medium text-site-text">{disclaimer.copyright}</p>
          </div>
        </div>
      </Container>

      <div className="bg-black text-white">
        <Container className="flex flex-col items-start gap-3 py-4 text-[12px] lg:flex-row lg:items-center lg:justify-between">
          <p>
            Real Estate Website Design by{' '}
            <span className="font-semibold">Abigail Anderson</span>
          </p>
          <p>
            Copyright © {currentYear} |{' '}
            <Link
              href="/terms-and-conditions"
              className="underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </Container>
      </div>

      <Container className="py-8 text-[11px] leading-relaxed text-site-text-muted">
        <p>{disclaimer.mlsGrid}</p>
        <p className="mt-4 font-semibold text-site-text">{disclaimer.brokerage}</p>
        <p className="mt-1 font-medium text-site-text">{disclaimer.copyright}</p>
      </Container>
    </footer>
  )
}
