import Link from 'next/link'
import {
  AuthCard,
  AuthNotice,
  authButtonClass,
  authFieldClass,
  authLabelClass,
} from '@/components/admin/auth-card'
import { requestPasswordReset } from '../login/actions'

export const metadata = { title: 'Reset password' }
export const dynamic = 'force-dynamic'

export default async function AdminForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>
}) {
  const { sent } = await searchParams
  return (
    <AuthCard
      title="Reset your password"
      intro="Enter your admin email and we'll send a link to choose a new password."
      footer={
        <Link href="/admin/login" className="hover:text-gray-900">
          Back to sign in
        </Link>
      }
    >
      {sent && (
        <AuthNotice tone="ok">
          If that address belongs to an admin, a reset link is on its way. It
          expires in an hour.
        </AuthNotice>
      )}
      <form action={requestPasswordReset}>
        <label className={authLabelClass}>
          Email
          <input type="email" name="email" required autoComplete="email" className={authFieldClass} />
        </label>
        <button type="submit" className={authButtonClass}>
          Send reset link
        </button>
      </form>
    </AuthCard>
  )
}
