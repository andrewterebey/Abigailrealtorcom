import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { provider } from '@/lib/idx'
import { getSnapshotDataAsOf } from '@/lib/idx/mlsgrid-provider'

export const metadata = { title: 'Listings' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const STATUS_LABEL: Record<string, string> = {
  'for-sale': 'Active',
  pending: 'Pending',
  sold: 'Sold',
}

const STATUS_DOT: Record<string, string> = {
  'for-sale': 'bg-emerald-500',
  pending: 'bg-amber-500',
  sold: 'bg-gray-400',
}

/**
 * Read-only listings browser. MLS data comes from the licensed NWMLS feed and
 * is never editable from the admin (see CLAUDE.md §7.11) — this screen exists
 * for oversight: what the feed contains and when it was last synced.
 */
export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const [{ items, total }, dataAsOf] = await Promise.all([
    provider.list({}, { limit: PAGE_SIZE, offset }),
    getSnapshotDataAsOf(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Listings</h1>
        <Link
          href="/home-search/listings"
          target="_blank"
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3.5 py-1.5 text-[13px] font-medium hover:bg-gray-50"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Open site search
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-semibold">{total.toLocaleString('en-US')}</div>
          <div className="mt-1 text-xs text-gray-500">Listings in feed</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-semibold">
            {dataAsOf
              ? new Date(dataAsOf).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : '—'}
          </div>
          <div className="mt-1 text-xs text-gray-500">Data obtained as of</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-semibold">Read-only</div>
          <div className="mt-1 text-xs text-gray-500">
            MLS data can&apos;t be edited here — it mirrors the NWMLS feed
          </div>
        </div>
      </div>

      <table className="mt-6 w-full text-[13px]">
        <thead>
          <tr className="border-y border-gray-200 text-left text-gray-500">
            <th className="py-2.5 font-medium">Listing</th>
            <th className="w-28 py-2.5 font-medium">MLS #</th>
            <th className="w-28 py-2.5 font-medium">Price</th>
            <th className="w-32 py-2.5 font-medium">Beds / Baths</th>
            <th className="w-24 py-2.5 font-medium">Sqft</th>
            <th className="w-28 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id} className="border-b border-gray-100">
              <td className="py-2.5">
                <span className="flex items-center gap-3">
                  <Image
                    src={l.primaryImage}
                    alt=""
                    width={64}
                    height={40}
                    className="h-10 w-16 shrink-0 rounded object-cover"
                  />
                  <span>
                    <span className="block font-medium">{l.address}</span>
                    <span className="block text-gray-500">
                      {l.city}, {l.state} {l.zip}
                    </span>
                  </span>
                </span>
              </td>
              <td className="py-2.5 text-gray-600">{l.mlsNumber}</td>
              <td className="py-2.5 font-medium">
                ${l.price.toLocaleString('en-US')}
              </td>
              <td className="py-2.5 text-gray-600">
                {l.beds} bd / {l.baths} ba
              </td>
              <td className="py-2.5 text-gray-600">
                {l.sqft.toLocaleString('en-US')}
              </td>
              <td className="py-2.5">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_DOT[l.status] ?? 'bg-gray-400'}`}
                    aria-hidden
                  />
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between py-3 text-[13px] text-gray-500">
        <span>
          Page {page} of {totalPages.toLocaleString('en-US')} ·{' '}
          {total.toLocaleString('en-US')} records
        </span>
        <span className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/listings?page=${page - 1}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-900 hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/listings?page=${page + 1}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-900 hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </span>
      </div>

      <p className="border-t border-gray-100 pt-3 text-xs text-gray-400">
        Listings courtesy of the Northwest Multiple Listing Service, as
        distributed by MLS GRID.
      </p>
    </div>
  )
}
