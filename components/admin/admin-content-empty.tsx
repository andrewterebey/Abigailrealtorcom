import { AdminEmptyState } from '@/components/admin/admin-empty-state'

/** Empty LP-style content tab (Teams, Developments, Offices, …): title bar
 *  with an inactive Add button and a "You have no X" state, like LP. */
export function AdminContentEmpty({
  title,
  addLabel,
}: {
  title: string
  addLabel: string
}) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{title}</h1>
        <button
          type="button"
          title="Not used on this site — kept for parity with the current dashboard"
          className="cursor-not-allowed rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white opacity-90"
        >
          {addLabel}
        </button>
      </div>
      <AdminEmptyState
        title={`You have no ${title}`}
        body={`Your ${title.toLowerCase()} will appear here.`}
        note="This content type isn't used on abigailrealtor.com."
      />
    </div>
  )
}
