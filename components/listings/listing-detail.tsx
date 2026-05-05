import Image from 'next/image'
import Link from 'next/link'
import type { ListingDetail as ListingDetailType } from '@/types/listing'
import { Container } from '@/components/site/container'

type ListingDetailProps = {
  listing: ListingDetailType
}

const STATUS_LABEL: Record<ListingDetailType['status'], string> = {
  'for-sale': 'For Sale',
  pending: 'Pending',
  sold: 'Sold',
}

const PROPERTY_TYPE_LABEL: Record<ListingDetailType['propertyType'], string> = {
  'single-family': 'Single Family',
  condo: 'Condo',
  townhouse: 'Townhouse',
  'multi-family': 'Multi-family',
  land: 'Land',
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function ListingDetail({ listing }: ListingDetailProps) {
  const {
    address,
    city,
    state,
    zip,
    price,
    beds,
    baths,
    sqft,
    status,
    primaryImage,
    images,
    description,
    yearBuilt,
    propertyType,
    features,
    schoolDistrict,
    mlsNumber,
  } = listing

  const gallery = images?.length ? images : [primaryImage]
  const thumbs = gallery.slice(1, 5)

  return (
    <article>
      <section
        aria-label="Listing gallery"
        className="relative bg-black"
      >
        <div className="relative aspect-[16/9] w-full md:aspect-[21/9]">
          <Image
            src={gallery[0]}
            alt={`${address}, ${city}, ${state} ${zip}`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <span className="absolute left-6 top-6 bg-site-gold px-4 py-1.5 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-white">
            {STATUS_LABEL[status]}
          </span>
        </div>
        {thumbs.length > 0 && (
          <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
            {thumbs.map((src, i) => (
              <div
                key={src}
                className="relative aspect-[4/3] w-full bg-neutral-200"
              >
                <Image
                  src={src}
                  alt={`${address} — photo ${i + 2}`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <Container className="py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div>
            <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
              MLS# {mlsNumber}
            </p>
            <h1 className="mt-2 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              {address}
            </h1>
            <p className="mt-3 font-body text-[15px] uppercase tracking-[0.12em] text-site-text">
              {city}, {state} {zip}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-black/10 py-6 md:grid-cols-4">
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                  Beds
                </dt>
                <dd className="mt-1 text-[24px] leading-none">{beds}</dd>
              </div>
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                  Baths
                </dt>
                <dd className="mt-1 text-[24px] leading-none">{baths}</dd>
              </div>
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                  Sqft
                </dt>
                <dd className="mt-1 text-[24px] leading-none">
                  {sqft.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-site-text-muted">
                  Year
                </dt>
                <dd className="mt-1 text-[24px] leading-none">{yearBuilt}</dd>
              </div>
            </dl>

            <div className="mt-10">
              <h2 className="text-[24px] leading-[1.3] md:text-[30px]">
                About This Home
              </h2>
              <p className="mt-4 whitespace-pre-line font-body text-[15px] leading-[1.7] text-site-text md:text-[16px]">
                {description}
              </p>
            </div>

            {features.length > 0 && (
              <div className="mt-10">
                <h2 className="text-[24px] leading-[1.3] md:text-[30px]">
                  Features
                </h2>
                <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 font-body text-[15px] text-site-text md:grid-cols-2">
                  {features.map((f) => (
                    <li key={f} className="border-b border-black/5 py-2">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border border-black/10 bg-white p-8">
              <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
                Price
              </p>
              <p className="mt-2 text-[32px] leading-none md:text-[40px]">
                {formatPrice(price)}
              </p>

              <dl className="mt-6 space-y-3 border-t border-black/10 pt-6 font-body text-[14px]">
                <div className="flex items-center justify-between">
                  <dt className="uppercase tracking-[0.1em] text-site-text-muted">
                    Type
                  </dt>
                  <dd>{PROPERTY_TYPE_LABEL[propertyType]}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="uppercase tracking-[0.1em] text-site-text-muted">
                    Status
                  </dt>
                  <dd>{STATUS_LABEL[status]}</dd>
                </div>
                {schoolDistrict && (
                  <div className="flex items-center justify-between">
                    <dt className="uppercase tracking-[0.1em] text-site-text-muted">
                      Schools
                    </dt>
                    <dd className="text-right">{schoolDistrict}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="uppercase tracking-[0.1em] text-site-text-muted">
                    MLS #
                  </dt>
                  <dd>{mlsNumber}</dd>
                </div>
              </dl>

              <Link
                href="/contact"
                className="mt-8 inline-flex w-full items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
              >
                Request a Tour
              </Link>
              <Link
                href="/properties"
                className="mt-3 inline-flex w-full items-center justify-center border border-black/15 bg-white px-[46px] py-[18px] font-body text-[13px] font-bold uppercase tracking-[0.14em] text-site-text hover:border-site-gold hover:text-site-gold"
              >
                Back to Listings
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </article>
  )
}
