import { cn } from '@/lib/utils'

type SectionProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div'
}

export function Section({
  as: Tag = 'section',
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <Tag
      className={cn('py-16 md:py-20 lg:py-24', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Eyebrow({ className, children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'font-body text-[14px] font-bold uppercase tracking-[0.1em] text-site-gold',
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  )
}
