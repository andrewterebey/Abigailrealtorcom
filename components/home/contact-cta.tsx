import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/site/container'

export function ContactCta() {
  return (
    <section
      aria-label="Ready to begin"
      className="relative overflow-hidden text-white"
    >
      <Image
        src="/images/home-contact-background.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority={false}
      />
      <div className="absolute inset-0 bg-black/55" aria-hidden />
      <Container className="relative z-10 flex flex-col items-center py-24 text-center md:py-28 lg:py-32">
        <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
          Let&apos;s Connect
        </p>
        <h2 className="mt-3 text-[32px] leading-[1.3] text-white md:text-[40px] lg:text-[43px]">
          Ready to Begin?
        </h2>
        <p className="mt-6 max-w-2xl font-body text-[15px] leading-[1.7] text-white/90 md:text-[16px]">
          Your goals matter. Let Abigail guide you with integrity, market
          expertise, and personal commitment through King County&apos;s
          ever-evolving real estate landscape. Schedule your consultation today!
        </p>
        <Link
          href="/contact"
          className="mt-10 inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
        >
          Contact Abigail
        </Link>
      </Container>
    </section>
  )
}
