import type { ListingSummary } from '@/types/listing'
import { ListingCard } from './listing-card'
import { cn } from '@/lib/utils'

type ListingGridProps = {
  items: ListingSummary[]
  className?: string
  emptyMessage?: string
}

export function ListingGrid({
  items,
  className,
  emptyMessage = 'No listings match these filters.',
}: ListingGridProps) {
  if (items.length === 0) {
    return (
      <p className="py-16 text-center font-body text-[14px] uppercase tracking-[0.14em] text-site-text-muted">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item, idx) => (
        <ListingCard key={item.id} listing={item} priority={idx < 3} />
      ))}
    </div>
  )
}
