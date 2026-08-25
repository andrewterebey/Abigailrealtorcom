import { AdminEmptyState } from '@/components/admin/admin-empty-state'

export const metadata = { title: 'Education' }

export default function AdminEducationPage() {
  return (
    <div className="px-6 py-5">
      <h1 className="text-lg font-semibold">Education</h1>
      <AdminEmptyState
        title="Guides are coming"
        body="Short walkthroughs for using this dashboard (editing posts, reading leads, checking listing syncs) will live here once the editing features land."
      />
    </div>
  )
}
