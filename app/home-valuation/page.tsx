import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/site/container'
import { Section, Eyebrow } from '@/components/site/section'

const META_TITLE = 'Free Bellevue, WA Home Valuation'
const META_DESCRIPTION =
  'Discover the true value of your property using this free tool. Call Abigail Anderson for a comprehensive evaluation of your home and more info on the area.'
const META_IMAGE = '/images/home-valuation-background.jpg'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: '/home-valuation' },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [{ url: META_IMAGE, width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [META_IMAGE],
  },
}

const FAQS = [
  {
    q: 'What is a Home Valuation?',
    a: "A home valuation determines the current market value of a residential property. It is crucial for real estate transactions, preventing excessive borrowing and financial losses. When getting a mortgage, the home acts as collateral. If the borrower defaults, the lender may sell the property to recover funds. A thorough home valuation safeguards the lender's ability to recover costs if the mortgage is not fully repaid.",
  },
  {
    q: 'How is the Valuation of My Home Calculated?',
    a: 'The value of your home is calculated using a combination of factors including its location, age, size, condition, any improvements or renovations made, and recent sale prices of comparable homes in the neighborhood. It also factors in current market trends and local market conditions. The valuation tool is dynamic and can be influenced by data such as inventory trends, interest rates, and current buyer sentiment.',
  },
  {
    q: 'How Accurate is the Online Home Valuation?',
    a: 'Online home valuations provide a good starting point and offer a general estimate of your property’s worth. However, they may not factor in recent renovations, unique features, historical value, architectural significance, and subjective market perception that could impact your home’s actual market value. For the most accurate assessment, consider scheduling an in-person appraisal.',
  },
] as const

const IMPORTANCE = [
  {
    label: 'Refinancing',
    body: 'Lenders base the amount of their loans on the value of your property and usually allow you to borrow a maximum of 75% to 96.5% against your property. Knowing what your home is worth allows lenders to calculate your equity in the home. The more equity you have, the better terms you will receive on your refinance.',
  },
  {
    label: 'Home Improvements',
    body: "If you’re doing home improvement projects to increase the resale value, you want to make sure you’re not pricing it out of the market. If your home is already priced on the high-end for your neighborhood, making too many improvements could make it more difficult to sell. When you get a valuation, you can see how your home compares with others in the neighborhood and let this guide your home improvement decisions.",
  },
  {
    label: 'Qualifying for Credit',
    body: 'If you want to borrow cash against your home, getting a Home Equity Line of Credit (HELOC) could be a good option. To qualify, you must have a certain level of equity in your home. Most lenders require at least 20%. Getting a home valuation will help you determine if you qualify and will be used by the lender to make a decision on your loan.',
  },
  {
    label: 'Planning',
    body: 'Though it’s not a necessity, simply knowing the value of your home is good information to have. It will help you plan for the future and deal with unforeseen circumstances when you might be in a position that requires extra money or a quick relocation. Knowing how much equity you have in your home and how much you may be able to borrow against it or sell it for will help you respond to any financial curveballs that life throws at you.',
  },
] as const

export default function HomeValuationPage() {
  return (
    <main>
      {/* Hero with headline + bullet list. The live site also has an instant-
          estimate form, but that's a 3rd-party widget; we render a teaser that
          anchors to the inquiry form below. */}
      <section
        aria-label="Home valuation hero"
        className="relative h-[420px] w-full overflow-hidden text-white md:h-[500px] lg:h-[560px]"
      >
        <Image
          src="/images/home-valuation-background.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="relative z-10 flex h-full items-center justify-center">
          <Container className="flex flex-col items-center text-center">
            <h1 className="text-[36px] leading-[1.1] text-white sm:text-[48px] md:text-[60px] lg:text-[70px]">
              How Much is Your Home Worth?
            </h1>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 font-body text-[13px] font-bold uppercase tracking-[0.14em] md:text-[14px]">
              <li>Instant Property Valuation</li>
              <li aria-hidden className="text-site-gold">
                •
              </li>
              <li>Expert Advice</li>
              <li aria-hidden className="text-site-gold">
                •
              </li>
              <li>Sell For More</li>
            </ul>
            {/* Inline address-input pill matching live. The live site wires this to
                a 3rd-party autocomplete + instant-estimate service; we don't have
                that widget so the form posts to /contact?topic=valuation as a
                fallback. The visual treatment matches: white pill, map-pin icon,
                amber submit button on the right. */}
            <form
              action="/contact"
              method="get"
              className="mt-10 flex w-full max-w-2xl items-stretch overflow-hidden rounded-full bg-white text-site-text shadow-lg"
            >
              <input type="hidden" name="topic" value="valuation" />
              <span aria-hidden className="flex items-center pl-5 pr-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5 text-site-text-muted"
                >
                  <path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 1 1 18 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <input
                type="text"
                name="address"
                aria-label="Home address"
                placeholder="Enter your home address"
                className="flex-1 bg-transparent py-4 font-body text-[14px] text-site-text placeholder:text-site-text-muted focus:outline-none"
              />
              <button
                type="submit"
                className="bg-site-gold px-6 py-4 font-body text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-site-gold-dim md:px-8 md:text-[13px]"
              >
                Get a Free Home Valuation
              </button>
            </form>
          </Container>
        </div>
      </section>

      {/* What's your property worth — intro with image on the right. */}
      <Section>
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <article>
              <Eyebrow>Unlock Your Property Value</Eyebrow>
              <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
                What&rsquo;s Your Property Worth?
              </h2>
              <p className="mt-6 font-body text-[15px] leading-[1.7] text-site-text">
                Home valuations give you valuable knowledge that can help you
                plan for the future and make smart decisions. It&rsquo;s good
                practice to stay informed about how much equity you have in
                your home and how much you may be able to borrow against it
                or sell it for.
              </p>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                Our tool provides a more robust, accurate assessment than
                you&rsquo;ll get from the major real estate portals. For the
                most precise valuation, reach out to discuss a customized
                Comparative Market Analysis or an appraisal.
              </p>
            </article>
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src="/images/home-valuation-image-main.jpg"
                alt="Modern kitchen with neutral tones"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* FAQ card row. */}
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {FAQS.map((faq) => (
              <article
                key={faq.q}
                className="border-l-4 border-site-gold bg-white p-8 text-left shadow-[0_1px_0_rgba(0,0,0,0.04)]"
              >
                <h3 className="text-[18px] leading-[1.3] md:text-[20px]">
                  {faq.q}
                </h3>
                <p className="mt-4 font-body text-[14px] leading-[1.7] text-site-text">
                  {faq.a}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      {/* Dark promo band linking out to search. */}
      <section aria-label="Start your home search" className="bg-black text-white">
        <Container className="flex flex-col items-center justify-between gap-6 py-10 text-center md:flex-row md:text-left">
          <h2 className="text-[24px] leading-[1.2] text-white md:text-[30px]">
            Start Your Home Search
          </h2>
          <Link
            href="/home-search/listings"
            className="inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
          >
            Learn More
          </Link>
        </Container>
      </section>

      {/* How Is a Valuation Performed. */}
      <Section>
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Know Before You Sell</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              How Is a Valuation Performed?
            </h2>
            <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
              Two Accurate Ways to Perform Home Valuations
            </p>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16">
            <article>
              <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
                Market Analysis
              </p>
              <h3 className="mt-3 text-[22px] leading-[1.3] md:text-[26px]">
                Comparative Market Analysis
              </h3>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                A{' '}
                <a
                  href="https://www.investopedia.com/terms/c/comparative-market-analysis.asp"
                  target="_blank"
                  rel="noreferrer"
                  className="text-site-gold underline-offset-4 hover:underline"
                >
                  Comparative Market Analysis (CMA)
                </a>{' '}
                is a tool used by real estate agents to value a home. It
                evaluates similar homes that have recently sold in the same
                area. Agents find comparable sales and use them to conduct a
                sales comparison. In most cases, an agent will find three
                homes that have recently sold and are as similar to and
                located as close to the home being valued as possible. Each
                one is then analyzed to pinpoint differences between it and
                the home being valued. Once these differences are priced out,
                the price of each comp is adjusted to see what it would cost
                if it was identical to the home being valued were it to be
                sold in the current market.
              </p>
            </article>
            <article>
              <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
                Appraisals
              </p>
              <h3 className="mt-3 text-[22px] leading-[1.3] md:text-[26px]">
                Based on a Professional&rsquo;s Opinion
              </h3>
              <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                <a
                  href="https://www.investopedia.com/articles/pf/12/home-appraisals.asp"
                  target="_blank"
                  rel="noreferrer"
                  className="text-site-gold underline-offset-4 hover:underline"
                >
                  An appraisal is an unbiased valuation
                </a>{' '}
                of a home based on a professional&rsquo;s opinion. They are
                usually what mortgage companies use for home purchases and
                refinances. A lender usually orders a home appraisal and the
                cost of the appraisal, sometimes up to $500, is paid by the
                homeowner. An appraiser does a complete visual inspection of
                the interior and exterior of the home as well as taking into
                consideration recent sales of similar properties and market
                trends. The appraiser then compiles a detailed report on the
                home, including an exterior building sketch, a street map
                showing the home and any comparable sales, photos of the
                home and street, an explanation of how the square footage was
                calculated, and any other relevant information.
              </p>
            </article>
          </div>
        </Container>
      </Section>

      {/* Why is a valuation important. */}
      <Section className="pt-0">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>Know Your Equity, Know Your Options</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.2] md:text-[40px] lg:text-[43px]">
              Why Is a Valuation Important?
            </h2>
            <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
              Situations When a Home Valuation May Be Necessary
            </p>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-12">
            {IMPORTANCE.map((item) => (
              <article key={item.label}>
                <p className="inline-block bg-site-gold px-4 py-2 font-body text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                  {item.label}
                </p>
                <p className="mt-4 font-body text-[15px] leading-[1.7] text-site-text">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

    </main>
  )
}
