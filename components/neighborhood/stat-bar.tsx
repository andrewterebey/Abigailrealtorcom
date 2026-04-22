import { cn } from '@/lib/utils'

type StatBarProps = {
  label: string
  /** 0-100 value driving the bar width. */
  percent: number
  /** Pre-formatted display value shown on the right (e.g. "58.65%", "10.44%"). */
  valueLabel?: string
  className?: string
}

/**
 * Horizontal gold progress bar with a label on the left and a percentage on
 * the right — used in the "Demographics and Employment" section of the
 * neighborhood detail pages.
 */
export function StatBar({ label, percent, valueLabel, className }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, percent))
  const display = valueLabel ?? `${pct.toFixed(2)}%`
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-body text-[13px] uppercase tracking-[0.1em] text-site-text">
          {label}
        </span>
        <span className="font-body text-[13px] font-bold text-site-text">
          {display}
        </span>
      </div>
      <div
        className="mt-2 h-[6px] w-full bg-black/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full bg-site-gold"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
