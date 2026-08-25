import { AdminEmptyState } from '@/components/admin/admin-empty-state'

export const metadata = { title: 'Presentations' }

export default function AdminPresentationsPage() {
  return (
    <div className="px-6 py-5">
      <h1 className="text-lg font-semibold">Presentations</h1>
      <AdminEmptyState
        title="No presentations yet"
        body="Listing and buyer presentations you create will appear here."
        cta="Create presentation"
        note="Not planned for the initial build — kept for parity with the current dashboard."
      />
    </div>
  )
}
