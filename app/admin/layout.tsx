import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

/**
 * Admin area shell — Luxury Presence-style frame: light-gray page with the
 * sidebar on the left and the content in a floating white rounded panel.
 *
 * ROUGH DRAFT: no authentication yet. Supabase Auth (middleware-guarded)
 * lands in the next phase — do NOT deploy this route publicly before then.
 * Design: docs/superpowers/specs/2026-08-25-admin-page-design.md
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
    <div className="admin-root flex h-screen overflow-hidden bg-[#f7f7f8] font-body text-gray-900 antialiased">
      <AdminSidebar />
      <main className="my-2 mr-2 grow overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {children}
      </main>
    </div>
  )
}
