import Link from 'next/link'
import {
  AuthCard,
  AuthNotice,
  authButtonClass,
  authFieldClass,
  authLabelClass,
} from '@/components/admin/auth-card'
import { safeAdminPath } from '@/lib/admin-auth'
import { signIn } from './actions'

export const metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'

const ERRORS: Record<string, string> = {
  invalid: 'That email and password combination was not recognized.',
  missing: 'Enter your email and password.',
  'rate-limited': 'Too many attempts. Wait fifteen minutes and try again.',
  'not-allowed': 'That account is not allowed to use the admin.',
  expired: 'That link has expired or was already used. Sign in or request a new one.',
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  const message = error ? ERRORS[error] ?? ERRORS.invalid : null

  return (
    <AuthCard
      title="Sign in"
      intro="Only Abigail and the site administrator can sign in here."
      footer={
        <Link href="/admin/forgot-password" className="hover:text-gray-900">
          Forgot your password?
        </Link>
      }
    >
      {message && <AuthNotice tone="error">{message}</AuthNotice>}
      <form action={signIn}>
        <input type="hidden" name="next" value={safeAdminPath(next)} />
        <label className={authLabelClass}>
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            autoFocus
            className={authFieldClass}
          />
        </label>
        <label className={`${authLabelClass} mt-4`}>
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className={authFieldClass}
          />
        </label>
        <button type="submit" className={authButtonClass}>
          Sign in
        </button>
      </form>
    </AuthCard>
  )
}
