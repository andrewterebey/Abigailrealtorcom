import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { createClient } from '@/lib/supabase/server'
import { isAllowedAdmin } from '@/lib/admin-auth'
import { signOut } from '../login/actions'

/**
 * Dashboard shell: sidebar on the left, content in the white rounded panel.
 * The middleware already turned away anyone without an allowed session;
 * this re-check is defense in depth (and gives the sidebar the email).
 */
export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAllowedAdmin(user.email)) redirect('/admin/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar email={user.email ?? ''} signOutAction={signOut} />
      <main className="my-2 mr-2 grow overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {children}
      </main>
    </div>
  )
}
