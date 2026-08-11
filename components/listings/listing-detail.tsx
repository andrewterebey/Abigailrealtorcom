import Image from 'next/image'
import Link from 'next/link'
import {
  STATUS_LABELS,
  type ListingDetail as ListingDetailType,
} from '@/types/listing'
import { displayCdom } from '@/lib/cdom'
import { Container } from '@/components/site/container'

type ListingDetailProps = {
  listing: ListingDetailType
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
    brokerageName,
    coBrokerageName,
    dataAsOf,
  } = listing
  const cdom = displayCdom(listing)

  const gallery = images?.length ? images : [primaryImage]
  const thumbs = gallery.slice(1, 5)

  return (
    <article>
      {/* NWMLS IDX Guidance §1: feed photos must show the ENTIRE image with the
          baked-in NWMLS watermark visible — "resize the photo maintaining aspect
          ratio and white pad as necessary, so it fits the entire image with the
          NWMLS watermark." So we display object-contain on white (no crop): the
          full image and its bottom-right watermark always show. (Summary-results
          thumbnails are the only crop exemption, and those are the listing
          cards, not this detail page.) */}
      <section aria-label="Listing gallery" className="relative bg-white">
        <div className="relative aspect-[16/9] w-full bg-white">
          <Image
            src={gallery[0]}
            alt={`${address}, ${city}, ${state} ${zip}`}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
          <span className="absolute left-6 top-6 bg-site-gold px-4 py-1.5 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-white">
            {listing.statusLabel ?? STATUS_LABELS[status]}
          </span>
        </div>
        {thumbs.length > 0 && (
          <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
            {thumbs.map((src, i) => (
              <div
                key={src}
                className="relative aspect-[4/3] w-full bg-white"
              >
                <Image
                  src={src}
                  alt={`${address} — photo ${i + 2}`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        )}
        {/* Listing-FIRM attribution immediately adjacent to the main photo(s),
            per the NWMLS reviewer (idx@nwmls.com, 2026-06) + MLS Grid IDX §22.
            Gated on dataAsOf so placeholder mode stays unbranded. The NWMLS
            *source* line stays next to the property info below. */}
        {dataAsOf && brokerageName && (
          <p className="bg-white px-6 py-3 font-body text-[15px] leading-[1.6] text-site-text md:text-[16px]">
            Listing courtesy of {brokerageName}
            {status === 'sold' && coBrokerageName
              ? ` · Buyer brokerage: ${coBrokerageName}`
              : ''}
          </p>
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

            {/* NWMLS *source* attribution, immediately adjacent to the property
                info. NWMLS confirmed (2026-06, idx@nwmls.com) the text
                attribution suffices in lieu of the three-tree icon and must sit
                immediately adjacent to the property info here. This is the exact
                NWMLS-approved string. The listing-FIRM attribution sits adjacent
                to the main photo above. Gated on dataAsOf so placeholder data
                stays unbranded. */}
            {dataAsOf && (
              <p className="mt-3 font-body text-[15px] leading-[1.6] text-site-text md:text-[16px]">
                Listings courtesy of the Northwest Multiple Listing Service, as
                distributed by MLS GRID
              </p>
            )}

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
                <dd className="mt-1 text-[24px] leading-none">{yearBuilt ?? '—'}</dd>
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
                  <dd>{(listing.statusLabel ?? STATUS_LABELS[status])}</dd>
                </div>
                {typeof cdom === 'number' && (
                  <div className="flex items-center justify-between">
                    <dt className="uppercase tracking-[0.1em] text-site-text-muted">
                      Cumulative Days on Market
                    </dt>
                    <dd>{cdom}</dd>
                  </div>
                )}
                {status === 'sold' && coBrokerageName && (
                  <div className="flex items-center justify-between">
                    <dt className="uppercase tracking-[0.1em] text-site-text-muted">
                      Buyer Brokerage
                    </dt>
                    <dd className="text-right">{coBrokerageName}</dd>
                  </div>
                )}
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

              {/* MLS Grid IDX Rule §22: the email or phone provided by the
                  Member Participant must appear adjacent to the listing
                  (alongside brokerage name, listing #, and status). */}
              <p className="mt-5 text-center font-body text-[14px] leading-[1.6] text-site-text">
                Listing presented by Abigail Anderson
                <br />
                <a
                  href="tel:+14252362853"
                  className="font-semibold underline underline-offset-4 hover:text-site-gold"
                >
                  (425) 236-2853
                </a>
              </p>
            </div>
          </aside>
        </div>

        {/* NWMLS/MLS Grid required listing-level disclaimer ([GRID §24]). Shown
            for genuine feed data only (dataAsOf set by the sync). */}
        {dataAsOf && (
          <p className="mt-12 border-t border-black/10 pt-6 font-body text-[12px] leading-[1.6] text-site-text-muted">
            Based on information submitted to the MLS GRID as of{' '}
            {new Date(dataAsOf).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
            . All data is obtained from various sources and may not have been
            verified by broker or MLS GRID. All information should be
            independently reviewed and verified for accuracy. Properties may or
            may not be listed by the office/agent presenting the information.
            Listing data courtesy of the Northwest Multiple Listing Service, as
            distributed by MLS GRID.
          </p>
        )}
      </Container>
    </article>
  )
}
