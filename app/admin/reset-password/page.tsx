import {
  AuthCard,
  AuthNotice,
  authButtonClass,
  authFieldClass,
  authLabelClass,
} from '@/components/admin/auth-card'
import { updatePassword } from '../login/actions'

export const metadata = { title: 'Choose a new password' }
export const dynamic = 'force-dynamic'

const ERRORS: Record<string, string> = {
  short: 'Use at least 12 characters.',
  mismatch: 'The two passwords do not match.',
  failed: 'Could not update the password. Request a new link and try again.',
}

/** Reached from the emailed link (middleware requires the session it creates). */
export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <AuthCard title="Choose a new password" intro="At least 12 characters. A short sentence works well.">
      {error && <AuthNotice tone="error">{ERRORS[error] ?? ERRORS.failed}</AuthNotice>}
      <form action={updatePassword}>
        <label className={authLabelClass}>
          New password
          <input
            type="password"
            name="password"
            required
            minLength={12}
            autoComplete="new-password"
            autoFocus
            className={authFieldClass}
          />
        </label>
        <label className={`${authLabelClass} mt-4`}>
          Confirm new password
          <input
            type="password"
            name="confirm"
            required
            minLength={12}
            autoComplete="new-password"
            className={authFieldClass}
          />
        </label>
        <button type="submit" className={authButtonClass}>
          Save password
        </button>
      </form>
    </AuthCard>
  )
}
