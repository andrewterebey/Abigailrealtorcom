import { cn } from '@/lib/utils'

type ContainerProps = React.HTMLAttributes<HTMLDivElement>

export function Container({ className, children, ...rest }: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1440px] px-[15px] sm:px-6 lg:px-8',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
