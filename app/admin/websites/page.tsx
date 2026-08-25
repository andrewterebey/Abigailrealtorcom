import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'

export const metadata = { title: 'Websites' }

/** Websites — LP's site-card grid with one card: this rebuild. */
export default function AdminWebsitesPage() {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Websites</h1>
        <button
          type="button"
          title="Single-site setup — creating more sites isn't part of this build"
          className="cursor-not-allowed rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white opacity-90"
        >
          Create Website
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-b border-gray-200 pb-3 text-[13px] text-gray-500">
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" aria-hidden /> Search...
        </span>
        <span>
          Website Type: <span className="text-gray-900">All</span> · Status:{' '}
          <span className="text-gray-900">All</span> · Sort by:{' '}
          <span className="text-gray-900">Last edited</span>
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/"
          target="_blank"
          className="overflow-hidden rounded-xl border border-gray-200 hover:border-gray-300"
        >
          <div className="relative">
            <Image
              src="/images/about-background.jpg"
              alt="abigailrealtor.com rebuild preview"
              width={600}
              height={340}
              className="h-44 w-full object-cover"
            />
            <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              Preview
            </span>
          </div>
          <div className="px-4 py-3">
            <div className="text-[13px] font-semibold">Abigail Anderson</div>
            <div className="mt-0.5 text-xs text-gray-500">
              abigailrealtor.com · rebuild (this site)
            </div>
          </div>
        </Link>
      </div>
      <p className="mt-4 text-xs text-gray-400">1 record</p>
    </div>
  )
}
