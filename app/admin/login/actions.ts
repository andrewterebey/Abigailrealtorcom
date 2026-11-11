'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAllowedAdmin, safeAdminPath } from '@/lib/admin-auth'
import { checkRateLimit } from '@/lib/rate-limit'

// Ten attempts per IP per quarter hour — far above two people's typos,
// well below a password-guessing script. Supabase rate-limits too; this
// keeps the noise off its logs.
const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 }

async function clientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

function toLogin(error: string, next?: string): never {
  const p = new URLSearchParams({ error })
  if (next) p.set('next', next)
  redirect(`/admin/login?${p.toString()}`)
}

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const next = safeAdminPath(String(formData.get('next') ?? ''))

  if (!email || !password) toLogin('missing', next)

  const rate = checkRateLimit(`login:${await clientIp()}`, LOGIN_RATE_LIMIT)
  if (!rate.ok) toLogin('rate-limited', next)

  // Refuse before contacting Supabase: nobody off the list gets to find out
  // whether their password was right.
  if (!isAllowedAdmin(email)) toLogin('invalid', next)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) toLogin('invalid', next)

  redirect(next)
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const rate = checkRateLimit(`reset:${await clientIp()}`, { limit: 5, windowMs: 15 * 60 * 1000 })

  // Same answer whether or not the address is known — no account discovery.
  if (rate.ok && email && isAllowedAdmin(email)) {
    const h = await headers()
    const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/admin/auth/confirm?next=/admin/reset-password`,
    })
  }
  redirect('/admin/forgot-password?sent=1')
}

export async function updatePassword(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password.length < 12) redirect('/admin/reset-password?error=short')
  if (password !== confirm) redirect('/admin/reset-password?error=mismatch')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAllowedAdmin(user.email)) redirect('/admin/login?error=expired')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect('/admin/reset-password?error=failed')
  redirect('/admin?password=updated')
}
