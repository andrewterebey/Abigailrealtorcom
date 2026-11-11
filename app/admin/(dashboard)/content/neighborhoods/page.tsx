import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, Search } from 'lucide-react'
import { NEIGHBORHOOD_SLUGS, NEIGHBORHOODS } from '@/lib/neighborhoods'

export const metadata = { title: 'Neighborhoods' }

/** Neighborhoods — LP-style table from the repo's neighborhood content.
 *  Rows link to the live public page; editing lands with the Supabase phase. */
export default function AdminNeighborhoodsPage() {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Neighborhoods</h1>
        <button
          type="button"
          title="Creating neighborhoods lands with the Supabase phase"
          className="cursor-not-allowed rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white opacity-90"
        >
          Add New
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2 text-gray-400">
          <Search className="h-4 w-4" aria-hidden />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        <span className="flex items-center gap-1.5 text-[13px] text-gray-500">
          Order by: <span className="font-medium text-gray-900">Newest Created</span>
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>

      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2.5 font-medium">Neighborhoods</th>
            <th className="w-40 py-2.5 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {/* LP lists these "Newest Created" first — reverse of the site's
              display order in NEIGHBORHOOD_SLUGS. */}
          {[...NEIGHBORHOOD_SLUGS].reverse().map((slug) => {
            const n = NEIGHBORHOODS[slug]
            return (
              <tr key={slug} className="border-b border-gray-100">
                <td className="py-3">
                  <Link
                    href={`/neighborhoods/${slug}`}
                    target="_blank"
                    className="flex items-center gap-4 font-semibold hover:underline"
                  >
                    <Image
                      src={n.cardImage}
                      alt=""
                      width={76}
                      height={48}
                      className="h-12 w-[76px] shrink-0 rounded object-cover"
                    />
                    {n.name}
                  </Link>
                </td>
                <td className="py-3 text-gray-600">—</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="py-3 text-xs text-gray-400">
        {NEIGHBORHOOD_SLUGS.length} records · rows open the live page; editing
        lands with the Supabase phase
      </p>
    </div>
  )
}
