import { AdminEmptyState } from '@/components/admin/admin-empty-state'

export const metadata = { title: 'Saved Searches' }

export default function AdminSavedSearchesPage() {
  return (
    <div className="px-6 py-5">
      <h1 className="text-lg font-semibold">Saved Searches</h1>
      <AdminEmptyState
        title="No saved searches"
        body="Searches you or your clients save will appear here with their alert settings."
        note="Activates with visitor accounts + lead storage — later phase."
      />
    </div>
  )
}
