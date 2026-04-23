import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Search } from 'lucide-react'
import { Container } from '@/components/site/container'
import { Eyebrow } from '@/components/site/section'
import { ListingGrid } from '@/components/listings/listing-grid'
import { ScoreCard } from '@/components/neighborhood/score-card'
import { StatBar } from '@/components/neighborhood/stat-bar'
import type { ListingSummary } from '@/types/listing'
import {
  getAgeGroupRows,
  getAroundIntro,
  getEducationRows,
  getPointsOfInterest,
  getScoreTiles,
  isNeighborhoodSlug,
  NEIGHBORHOODS,
  NEIGHBORHOOD_SLUGS,
  readNeighborhood,
  type MarkdownBlock,
  type MarkdownSection,
  type NeighborhoodSlug,
} from '@/lib/neighborhoods'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return NEIGHBORHOOD_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isNeighborhoodSlug(slug)) return { title: 'Neighborhood not found' }
  const n = NEIGHBORHOODS[slug]
  const title = `${n.name} | Neighborhood Guide | Abigail Anderson`
  const description = `Explore the ${n.name} community with Abigail Anderson\u2019s neighborhood guide. Discover top attractions, dining spots, schools and more.`
  const ogImage = n.heroImage
  return {
    title,
    description,
    alternates: { canonical: `/neighborhoods/${slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/neighborhoods/${slug}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${n.name} neighborhood`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

async function fetchCityListings(city: string): Promise<ListingSummary[]> {
  // Resolve the base URL for server-side fetches. On the edge / during build
  // we use the configured site URL; in dev we fall back to localhost.
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    'http://localhost:3000'
  const url = `${base.replace(/\/$/, '')}/api/listings?city=${encodeURIComponent(
    city,
  )}&status=for-sale&limit=8`
  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = (await res.json()) as { items: ListingSummary[] }
    return json.items ?? []
  } catch {
    return []
  }
}

export default async function NeighborhoodDetailPage({ params }: PageProps) {
  const { slug } = await params
  if (!isNeighborhoodSlug(slug)) notFound()
  const typedSlug: NeighborhoodSlug = slug
  const n = NEIGHBORHOODS[typedSlug]
  const parsed = readNeighborhood(typedSlug)

  const overview = parsed.sections.find((s) => /^Overview for/i.test(s.title))
  const around = parsed.sections.find((s) => /^Around /i.test(s.title))
  const demographics = parsed.sections.find((s) =>
    /^Demographics and Employment/i.test(s.title),
  )

  const handledTitles = new Set(
    [overview, around, demographics]
      .filter((s): s is MarkdownSection => Boolean(s))
      .map((s) => s.title),
  )
  const otherSections = parsed.sections.filter((s) => !handledTitles.has(s.title))

  const otherNeighborhoods = NEIGHBORHOOD_SLUGS.filter(
    (s) => s !== typedSlug,
  ).slice(0, 3)

  const scoreTiles = around ? getScoreTiles(around) : []
  const aroundIntro = around ? getAroundIntro(around) : null
  const poi = around ? getPointsOfInterest(around) : { intro: null, chips: [] }

  const ageRows = demographics ? getAgeGroupRows(demographics) : []
  const educationRows = demographics ? getEducationRows(demographics) : []

  const listings = await fetchCityListings(n.name)

  return (
    <main>
      {/* Hero */}
      <section
        aria-label={`${n.name} hero`}
        className="relative flex min-h-[560px] items-center justify-center overflow-hidden text-white md:min-h-[640px] lg:min-h-[720px]"
      >
        <Image
          src={n.heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/25" aria-hidden />
        <Container className="relative z-10 py-24 text-center md:py-28 lg:py-32">
          <h1 className="text-[56px] uppercase leading-[1.05] tracking-[0.06em] text-white sm:text-[80px] lg:text-[104px]">
            {parsed.title}
          </h1>
        </Container>
      </section>

      {/* Property Listings */}
      <section
        aria-label="Property Listings"
        className="py-16 md:py-20 lg:py-24"
      >
        <Container>
          <h2 className="text-center text-[28px] uppercase leading-[1.2] tracking-[0.1em] md:text-[36px] lg:text-[40px]">
            Property Listings
          </h2>

          {/* Non-interactive search input — the live site's IDX search widget
              is beyond scope for the neighborhood detail page (see TODO.md). */}
          <div className="mx-auto mt-8 flex max-w-5xl items-center gap-3 border-b border-black/30 pb-3">
            <Search
              aria-hidden
              className="h-5 w-5 shrink-0 text-site-text-muted"
            />
            <label className="sr-only" htmlFor={`${slug}-listing-search`}>
              Search by address, city, or neighborhood
            </label>
            <input
              id={`${slug}-listing-search`}
              type="search"
              readOnly
              placeholder="Search by Address, City, or Neighborhood"
              className="w-full bg-transparent font-body text-[14px] text-site-text placeholder:text-site-text-muted focus:outline-none md:text-[15px]"
            />
          </div>

          <div className="mt-12">
            <ListingGrid
              items={listings}
              className="lg:grid-cols-4"
              emptyMessage={`No active ${n.name} listings right now — check back soon.`}
            />
          </div>

          <p className="mx-auto mt-10 max-w-4xl text-center font-body text-[12px] leading-[1.6] text-site-text-muted">
            Based on information submitted to the MLS GRID. All data is obtained
            from various sources and may not have been verified by the broker or
            MLS GRID. Supplied Open House Information is subject to change
            without notice. All information should be independently reviewed and
            verified for accuracy. Properties may or may not be listed by the
            office/agent presenting the information.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href={`/home-search/listings?city=${encodeURIComponent(n.name)}`}
              className="inline-flex items-center justify-center bg-site-gold px-[46px] py-[20px] font-body text-[14px] font-bold uppercase tracking-[0.107em] text-white transition-colors hover:bg-site-gold-dim"
            >
              View More {n.name} Homes
            </Link>
          </div>
        </Container>
      </section>

      {/* Overview + sidebar */}
      {overview ? (
        <section
          aria-label={`Overview for ${n.name}`}
          className="bg-black/[0.02] py-16 md:py-20 lg:py-24"
        >
          <Container>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-14">
              <div className="lg:col-span-2">
                <Eyebrow>About</Eyebrow>
                <h2 className="mt-3 text-[28px] uppercase leading-[1.2] tracking-[0.04em] md:text-[34px] lg:text-[40px]">
                  {overview.title}
                </h2>
                <div className="mt-6 space-y-6">
                  <BlockList blocks={getParagraphs(overview)} />
                </div>
              </div>
              <aside className="border-t border-black/10 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
                <dl className="space-y-6">
                  {getQuickFacts(overview).map((f, i) => (
                    <div key={i}>
                      <dt className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-site-text-muted">
                        {f.label}
                      </dt>
                      <dd className="mt-1 font-display text-[24px] leading-[1.2] text-black md:text-[26px]">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </aside>
            </div>
          </Container>
        </section>
      ) : null}

      {/* Around <City>, WA + score cards + Points of Interest */}
      {around ? (
        <section
          aria-label={around.title}
          className="bg-[#1f1f1f] py-16 text-white md:py-20 lg:py-24"
        >
          <Container>
            <h2 className="text-[28px] uppercase leading-[1.2] tracking-[0.04em] text-white md:text-[34px] lg:text-[40px]">
              {around.title}
            </h2>
            {aroundIntro ? (
              <p className="mt-5 max-w-3xl font-body text-[15px] leading-[1.7] text-white/80 md:text-[16px]">
                {aroundIntro}
              </p>
            ) : null}

            {scoreTiles.length > 0 ? (
              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                {scoreTiles.slice(0, 3).map((t, i) => (
                  <ScoreCard
                    key={i}
                    score={t.score}
                    label={t.label}
                    category={t.category}
                    className="border-white/10 bg-white/[0.04] text-white"
                  />
                ))}
              </div>
            ) : null}

            {poi.intro || poi.chips.length ? (
              <div className="mt-14">
                <h3 className="text-[22px] uppercase leading-[1.2] tracking-[0.04em] text-white md:text-[26px]">
                  Points of Interest
                </h3>
                {poi.intro ? (
                  <p className="mt-4 max-w-3xl font-body text-[15px] leading-[1.7] text-white/80 md:text-[16px]">
                    {poi.intro}
                  </p>
                ) : null}
                {poi.chips.length ? (
                  <ul className="mt-6 flex flex-wrap gap-3">
                    {poi.chips.map((chip) => (
                      <li key={chip}>
                        <span className="inline-flex items-center border border-white/30 px-4 py-2 font-body text-[12px] font-bold uppercase tracking-[0.12em] text-white/80">
                          {chip}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </Container>
        </section>
      ) : null}

      {/* Demographics + Employment */}
      {demographics ? (
        <section
          aria-label={demographics.title}
          className="py-16 md:py-20 lg:py-24"
        >
          <Container>
            <h2 className="text-[24px] uppercase leading-[1.3] tracking-[0.04em] md:text-[30px] lg:text-[34px]">
              {demographics.title}
            </h2>

            {ageRows.length === 0 && educationRows.length === 0 ? (
              <p className="mt-6 max-w-4xl font-body text-[15px] leading-[1.7] text-site-text md:text-[16px]">
                Demographic breakdowns for {n.name} are available on request.
              </p>
            ) : (
              <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-2">
                {ageRows.length > 0 ? (
                  <div>
                    <h3 className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
                      Population by Age Group
                    </h3>
                    <div className="mt-6 space-y-5">
                      {ageRows.map((row, i) => (
                        <StatBar
                          key={i}
                          label={row.label}
                          percent={row.percent}
                          valueLabel={row.valueLabel}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {educationRows.length > 0 ? (
                  <div>
                    <h3 className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-gold">
                      Education Level
                    </h3>
                    <div className="mt-6 space-y-5">
                      {educationRows.map((row, i) => (
                        <StatBar
                          key={i}
                          label={row.label}
                          percent={row.percent}
                          valueLabel={row.valueLabel}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </Container>
        </section>
      ) : null}

      {/* Any additional sections (e.g. Schools) still render as plain copy. */}
      {otherSections.map((section, idx) => (
        <section
          key={idx}
          className={`py-14 md:py-16 lg:py-20 ${
            idx % 2 === 0 ? 'bg-black/[0.02]' : ''
          }`}
        >
          <Container>
            <h2 className="text-[24px] uppercase leading-[1.2] tracking-[0.04em] md:text-[30px] lg:text-[34px]">
              {section.title}
            </h2>
            <div className="mt-6 max-w-4xl space-y-5">
              <BlockList blocks={section.blocks} />
            </div>
          </Container>
        </section>
      ))}

      {/* Map placeholder */}
      <section className="py-14 md:py-16 lg:py-20">
        <Container>
          <Eyebrow>On the Map</Eyebrow>
          <h2 className="mt-3 text-[28px] leading-[1.2] md:text-[34px] lg:text-[38px]">
            {n.name} Area
          </h2>
          <div
            className="mt-8 flex aspect-[16/6] w-full items-center justify-center border border-black/10 bg-black/[0.04] text-center"
            role="img"
            aria-label={`Static placeholder map of ${n.name}`}
          >
            <div>
              <p className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text-muted">
                Map preview
              </p>
              <p className="mt-2 font-body text-[14px] text-site-text">
                {n.name}, WA &middot; {n.coords.lat.toFixed(4)},{' '}
                {n.coords.lng.toFixed(4)}
              </p>
              <p className="mt-2 font-body text-[12px] text-site-text-muted">
                Interactive Leaflet map to be wired up (see TODO.md).
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Explore other neighborhoods */}
      <section className="py-14 md:py-16 lg:py-20">
        <Container>
          <div className="flex items-end justify-between gap-6">
            <div>
              <Eyebrow>Keep Exploring</Eyebrow>
              <h2 className="mt-3 text-[28px] leading-[1.2] md:text-[34px] lg:text-[38px]">
                Explore Other Neighborhoods
              </h2>
            </div>
            <Link
              href="/neighborhoods"
              className="hidden font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text transition-colors hover:text-site-gold lg:inline-flex"
            >
              View All
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {otherNeighborhoods.map((s) => {
              const other = NEIGHBORHOODS[s]
              return (
                <li key={s}>
                  <Link href={`/neighborhoods/${s}`} className="group block">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={other.cardImage}
                        alt={`${other.name} neighborhood`}
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover transition-transform duration-[700ms] group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/40" />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <span aria-hidden className="h-4 w-px bg-site-gold" />
                      <span className="font-body text-[12px] font-bold uppercase tracking-[0.2em] text-site-text transition-colors group-hover:text-site-gold">
                        {other.name} &mdash; Learn More
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Container>
      </section>
    </main>
  )
}

/* ----------------------------- render helpers ---------------------------- */

function BlockList({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'paragraph') {
          return (
            <p
              key={i}
              className="font-body text-[15px] leading-[1.7] text-site-text md:text-[16px]"
            >
              {b.text}
            </p>
          )
        }
        if (b.kind === 'list') {
          return (
            <ul
              key={i}
              className="ml-5 list-disc space-y-2 font-body text-[15px] leading-[1.7] text-site-text md:text-[16px]"
            >
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          )
        }
        // heading
        const Tag = (
          b.level === 3 ? 'h3' : b.level === 4 ? 'h4' : b.level === 5 ? 'h5' : 'h6'
        ) as 'h3' | 'h4' | 'h5' | 'h6'
        return (
          <Tag key={i} className="pt-2">
            {b.text}
          </Tag>
        )
      })}
    </>
  )
}

/** Pull paragraph + list blocks out of the Overview section for the main column. */
function getParagraphs(section: MarkdownSection): MarkdownBlock[] {
  return section.blocks.filter(
    (b) => b.kind === 'paragraph' || b.kind === 'list',
  )
}

/**
 * The Overview section on the live site alternates `##### <value>` with a
 * plain-text label (e.g. "Total Population"). Zip them back together for the
 * sidebar quick-facts list.
 */
function getQuickFacts(section: MarkdownSection) {
  const facts: { label: string; value: string }[] = []
  const blocks = section.blocks
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.kind === 'heading' && b.level === 5) {
      // Find the next paragraph to use as the label.
      for (let j = i + 1; j < blocks.length; j++) {
        const next = blocks[j]
        if (next.kind === 'paragraph') {
          facts.push({ label: next.text, value: b.text })
          break
        }
        if (next.kind === 'heading' && next.level === 5) break
      }
    }
  }
  return facts.slice(0, 4)
}
