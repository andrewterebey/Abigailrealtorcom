import { AdminEmptyState } from '@/components/admin/admin-empty-state'

export const metadata = { title: 'Actions' }

export default function AdminActionsPage() {
  return (
    <div className="px-6 py-5">
      <h1 className="text-lg font-semibold">Actions</h1>
      <div className="mt-3 flex items-center gap-1 text-[13px]">
        {['Review', 'Saved', 'History'].map((tab, i) => (
          <span
            key={tab}
            className={`rounded-lg px-3 py-1.5 ${
              i === 0 ? 'bg-[#f2f2f3] font-medium text-gray-900' : 'text-gray-500'
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
      <AdminEmptyState
        title="You're all caught up"
        body="Suggested follow-ups on your leads will appear here."
        note="Activates once lead storage (Supabase phase) is wired."
      />
    </div>
  )
}
