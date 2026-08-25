import Link from 'next/link'

export const metadata = { title: 'Email Campaigns' }

/** LP shows Marketing → Email Campaigns as moved into Auto Email; mirrored. */
export default function AdminMarketingPage() {
  return (
    <div className="px-6 py-5">
      <p className="text-[13px] text-gray-500">
        Email campaigns <span className="mx-1">›</span>{' '}
        <span className="text-gray-900">Home valuation alerts</span>
      </p>
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div className="mb-8 h-24 w-28 rounded-xl border border-gray-200 bg-[#fafafa] p-3 shadow-sm">
          <div className="mb-2 h-2 w-14 rounded bg-gray-200" />
          <div className="h-12 rounded bg-gray-100" />
        </div>
        <h2 className="text-[15px] font-semibold">This page has a new home</h2>
        <p className="mt-2 max-w-sm text-[13px] leading-5 text-gray-500">
          This page moved to Auto email, where all your email activity now
          lives.
        </p>
        <Link
          href="/admin/auto-emails"
          className="mt-5 rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white"
        >
          Go to Auto email
        </Link>
      </div>
    </div>
  )
}
