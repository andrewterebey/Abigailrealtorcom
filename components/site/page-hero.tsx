import Image from 'next/image'
import { Container } from '@/components/site/container'

type PageHeroProps = {
  title: string
  /** Background photo. Omit for a solid-black hero (legal/utility pages). */
  imageSrc?: string
  imageAlt?: string
  eyebrow?: string
  subtitle?: string
}

/**
 * Standard sub-page hero banner — a full-width background image with a
 * centered serif display title. When `imageSrc` is omitted the hero is a
 * solid-black panel (used on DMCA / Terms / Privacy to give the transparent
 * site header something dark to sit on — matches the live site).
 */
export function PageHero({
  title,
  imageSrc,
  imageAlt = '',
  eyebrow,
  subtitle,
}: PageHeroProps) {
  return (
    <section
      aria-label={title}
      className="relative h-[320px] w-full overflow-hidden bg-black text-white md:h-[380px] lg:h-[460px]"
    >
      {imageSrc ? (
        <>
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/35" aria-hidden />
        </>
      ) : null}
      <div className="relative z-10 flex h-full items-center justify-center">
        <Container className="flex flex-col items-center text-center">
          {eyebrow ? (
            <p className="mb-3 font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[36px] leading-[1.1] text-white sm:text-[48px] md:text-[60px] lg:text-[70px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 max-w-2xl font-body text-[14px] text-white/90 md:text-[16px]">
              {subtitle}
            </p>
          ) : null}
        </Container>
      </div>
    </section>
  )
}
