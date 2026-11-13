import Link from 'next/link'

/** Centered card used by the login, forgot-password and reset pages. */
export function AuthCard({
  title,
  intro,
  children,
  footer,
}: {
  title: string
  intro?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-[12px] font-semibold text-white">
            AA
          </span>
          <span className="text-[14px] font-medium text-gray-900">Abigail Anderson · Admin</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-7 shadow-sm">
          <h1 className="text-[17px] font-semibold">{title}</h1>
          {intro && <p className="mt-1.5 text-[13px] leading-5 text-gray-500">{intro}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-[13px] text-gray-500">{footer}</div>}
        <p className="mt-8 text-center text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            abigailrealtor.com
          </Link>
        </p>
      </div>
    </div>
  )
}

export const authFieldClass =
  'mt-1.5 w-full rounded-lg border border-gray-200 bg-[#f7f7f8] px-3 py-2.5 text-[14px] outline-none focus:border-gray-400 focus:bg-white'
export const authLabelClass = 'block text-[13px] font-medium'
export const authButtonClass =
  'mt-5 w-full rounded-lg bg-black px-4 py-2.5 text-[14px] font-medium text-white hover:bg-gray-800'

export function AuthNotice({ tone, children }: { tone: 'error' | 'ok'; children: React.ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-4 rounded-lg px-3 py-2 text-[13px] ${
        tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
      }`}
    >
      {children}
    </p>
  )
}
