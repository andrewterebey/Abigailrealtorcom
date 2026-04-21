import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/site/container'

export function ReadyToBegin() {
  return (
    <section
      aria-label="Ready to begin"
      className="relative overflow-hidden"
    >
      <Image
        src="/images/home-contact-background.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-white/70" aria-hidden />
      <Container className="relative py-20 text-center md:py-24 lg:py-28">
        <h2 className="text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
          Ready to Begin?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl font-body text-[15px] leading-[1.7] text-site-text">
          Your goals matter. Let Abigail guide you with integrity, market
          expertise, and personal commitment through King County&rsquo;s
          ever-evolving real estate landscape. Schedule your consultation
          today!
        </p>
        <Link
          href="/contact"
          className="mt-10 inline-flex items-center justify-center bg-site-gold px-10 py-[18px] font-body text-[14px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-site-gold-dim"
        >
          Let&rsquo;s Connect
        </Link>
      </Container>
    </section>
  )
}
