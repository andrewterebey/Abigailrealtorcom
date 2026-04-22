import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/site/container'

const BIO = `Navigating the world of real estate can be one of the most significant decisions you'll ever make. As a dedicated real estate professional, Abigail brings deep market knowledge and a commitment to providing trustworthy, personalized guidance throughout your journey. Whether you're searching for your dream home or aiming to maximize the return on your investment, Abigail's expertise as a Certified Relocation Expert ensures that you have a seasoned advisor by your side every step of the way. With a global perspective and a passion for helping clients achieve their real estate goals, Abigail is here to realize your aspirations. Ready to make your next move? Abigail is here to help you succeed.`

export function GetToKnow() {
  return (
    <section className="py-16 md:py-20 lg:py-24">
      <Container>
        {/* Live: 12-col grid inside the standard container. Portrait fills
            cols 1–6 with a fixed ~5/4 aspect ratio (650×523 at 1440 viewport),
            content sits in cols 8–12 with col 7 as the gap. */}
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-0">
          <div className="lg:col-span-6">
            <div className="relative aspect-[650/523] w-full overflow-hidden">
              <Image
                src="/images/home-portrait-main.jpg"
                alt="Abigail Anderson"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 650px, 100vw"
                priority
              />
            </div>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
              Passion, Precision &amp; Purpose
            </p>
            <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              Get To Know Abigail
            </h2>
            <p className="mt-6 font-body text-[15px] leading-[1.7] text-site-text">
              {BIO}
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
            >
              Learn More
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
