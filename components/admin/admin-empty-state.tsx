/**
 * Centered empty-state panel, matching Luxury Presence's pattern: a small
 * illustration card, a bold line, supporting copy, and an optional (inactive)
 * call-to-action. Used by admin sections that have no functionality yet.
 */
export function AdminEmptyState({
  title,
  body,
  cta,
  note,
}: {
  title: string
  body: string
  /** Rendered as a disabled LP-style black button. */
  cta?: string
  /** Small gray line under the button, e.g. what phase activates this. */
  note?: string
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 h-28 w-32 rounded-xl border border-gray-200 bg-[#fafafa] p-3 shadow-sm">
        <div className="mb-2 h-2 w-16 rounded bg-gray-200" />
        <div className="h-16 rounded bg-gray-100" />
      </div>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-[13px] leading-5 text-gray-500">{body}</p>
      {cta && (
        <button
          type="button"
          title={note ?? 'Not available in the rough draft'}
          className="mt-5 cursor-not-allowed rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white opacity-90"
        >
          {cta}
        </button>
      )}
      {note && <p className="mt-3 text-xs text-gray-400">{note}</p>}
    </div>
  )
}
