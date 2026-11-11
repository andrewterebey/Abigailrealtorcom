import type { Metadata } from 'next'

/**
 * Admin area root: never indexed, LP-style neutral chrome (.admin-root resets
 * the public heading styles — app/globals.css). Access control lives in
 * middleware.ts (session + ADMIN_EMAILS allowlist) and is re-checked by the
 * dashboard layout; the auth pages (login, forgot/reset password) render
 * inside this layout without the sidebar.
 */

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false },
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="admin-root min-h-screen bg-[#f7f7f8] font-body text-gray-900 antialiased">
      {children}
    </div>
  )
}
