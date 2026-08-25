import { AdminEmptyState } from '@/components/admin/admin-empty-state'

export const metadata = { title: 'Collaborations' }

export default function AdminCollaborationsPage() {
  return (
    <div className="px-6 py-5">
      <h1 className="text-lg font-semibold">Collaborations</h1>
      <AdminEmptyState
        title="Start collaborating"
        body="Share listings, exchange notes, and manage the home search together. Invite clients, agents, or family."
        cta="Create a collaboration"
        note="Not planned for the initial build — kept for parity with the current dashboard."
      />
    </div>
  )
}
