import { cn } from '@/lib/utils'

type ScoreCardProps = {
  /** The numeric score (e.g. "11", "76"). */
  score: string
  /** The qualitative label below the score (e.g. "Car-Dependent", "Very Walkable"). */
  label: string
  /** The category sublabel (e.g. "Walking Score", "Bike Score", "Transit Score"). */
  category: string
  className?: string
}

/**
 * Matches the live-site score tile in the "Around <City>, WA" section:
 * a big gold number stacked on a qualitative label and small caps sublabel.
 */
export function ScoreCard({ score, label, category, className }: ScoreCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start border border-black/10 bg-white px-6 py-8 md:px-8 md:py-10',
        className,
      )}
    >
      <p className="font-display text-[56px] leading-none text-site-gold md:text-[64px]">
        {score}
      </p>
      <p className="mt-4 font-display text-[20px] leading-[1.3] text-black md:text-[22px]">
        {label}
      </p>
      <p className="mt-2 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-site-text-muted">
        {category}
      </p>
    </div>
  )
}
