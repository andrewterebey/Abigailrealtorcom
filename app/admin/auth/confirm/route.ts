import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeAdminPath } from '@/lib/admin-auth'

/**
 * Lands the links Supabase emails (password reset). Supabase redirects here
 * with a one-time `code`; exchanging it creates the session, after which the
 * visitor continues to `next` (the reset-password page). Supabase must list
 * this URL under Authentication → URL Configuration → Redirect URLs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeAdminPath(url.searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }
  return NextResponse.redirect(new URL('/admin/login?error=expired', request.url))
}
