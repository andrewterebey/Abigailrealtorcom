export const metadata = { title: 'Listing Feeds' }

/** Listing Feeds — ours is the NWMLS/MLS Grid replication, shown honestly. */
export default function AdminListingFeedsPage() {
  return (
    <div className="px-6 py-5">
      <h1 className="text-lg font-semibold">Listing Feeds</h1>
      <div className="mt-4 rounded-xl border border-gray-200 px-5 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold">
              NWMLS via MLS Grid
            </div>
            <div className="mt-0.5 text-[13px] text-gray-500">
              Replicated every 12 hours to Supabase (photos + data), then the
              site rebuilds from the published snapshot.
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Active
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Feed configuration is managed in code/CI, not editable here.
      </p>
    </div>
  )
}
