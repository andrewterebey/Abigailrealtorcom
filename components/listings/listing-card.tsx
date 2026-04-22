import Image from 'next/image'
import Link from 'next/link'
import type { ListingSummary } from '@/types/listing'
import { cn } from '@/lib/utils'

type ListingCardProps = {
  listing: ListingSummary
  priority?: boolean
  className?: string
}

const STATUS_LABEL: Record<ListingSummary['status'], string> = {
  'for-sale': 'For Sale',
  pending: 'Pending',
  sold: 'Sold',
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function ListingCard({ listing, priority = false, className }: ListingCardProps) {
  const {
    slug,
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
  } = listing

  return (
    <article className={cn('group flex flex-col text-left', className)}>
      <Link
        href={`/properties/${slug}`}
        aria-label={`${address}, ${city}`}
        className="block"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
          <Image
            src={primaryImage}
            alt={`${address}, ${city}, ${state} ${zip}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-[700ms] group-hover:scale-[1.03]"
            priority={priority}
          />
          <span
            className={cn(
              'absolute left-4 top-4 bg-site-gold px-3 py-1 font-body text-[11px] font-bold uppercase tracking-[0.14em] text-white',
              status === 'pending' && 'bg-black',
              status === 'sold' && 'bg-black',
            )}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>
      </Link>

      <div className="mt-5">
        <Link href={`/properties/${slug}`} className="block">
          <h3 className="text-[21px] leading-[1.3]">{address}</h3>
        </Link>
        <p className="mt-1 font-body text-[13px] uppercase tracking-[0.1em] text-site-text">
          {city}, {state} {zip}
        </p>
        <p className="mt-2 font-body text-[12px] uppercase tracking-[0.12em] text-site-text-muted">
          {beds} BD | {baths} BA | {sqft.toLocaleString()} sqft
        </p>
        <p className="mt-3 font-body text-[17px] font-semibold text-site-text">
          {formatPrice(price)}
        </p>
      </div>
    </article>
  )
}
