import { AdminEmptyState } from '@/components/admin/admin-empty-state'

export const metadata = { title: 'Saved Listings' }

export default function AdminSavedListingsPage() {
  return (
    <div className="px-6 py-5">
      <h1 className="text-lg font-semibold">Saved Listings</h1>
      <AdminEmptyState
        title="No saved listings"
        body="Properties you or your clients favorite will appear here."
        note="Activates with visitor accounts + lead storage — later phase."
      />
    </div>
  )
}
