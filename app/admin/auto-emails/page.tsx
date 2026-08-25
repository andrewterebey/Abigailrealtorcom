export const metadata = { title: 'Auto emails' }

/**
 * Auto emails — mirrors LP's three alert programs. None are wired on the
 * rebuild yet (needs lead storage + Resend), so programs show "Planned"
 * instead of LP's "Active".
 */

const PROGRAMS = [
  {
    name: 'Saved searches',
    body: 'Instant, daily, weekly, or monthly alerts of matching properties',
  },
  {
    name: 'Home valuations',
    body: 'Monthly alert to check updated home valuation',
  },
  {
    name: 'Saved listings',
    body: 'Instant alerts for any changes on saved properties',
  },
]

export default function AdminAutoEmailsPage() {
  return (
    <div className="px-6 py-5">
      <h1 className="text-lg font-semibold">Auto emails</h1>
      <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
        {PROGRAMS.map((p) => (
          <div key={p.name} className="flex items-center gap-5 px-5 py-6">
            <div className="h-16 w-20 shrink-0 rounded-lg border border-gray-200 bg-[#fafafa]" />
            <div className="grow">
              <div className="text-[13px] font-semibold">{p.name}</div>
              <div className="mt-0.5 text-[13px] text-gray-500">{p.body}</div>
            </div>
            <span className="rounded-md bg-[#f2f2f3] px-2 py-1 text-xs font-medium text-gray-600">
              Planned
            </span>
            <span className="text-[13px] text-gray-500">0 Enrolled</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Email programs activate after lead storage and transactional email
        (Resend) are wired — later phase.
      </p>
    </div>
  )
}
