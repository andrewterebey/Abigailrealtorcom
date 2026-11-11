import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * Supabase client for server components, server actions and route handlers.
 * Session cookies are HTTP-only and managed by @supabase/ssr; the browser
 * never gets a Supabase client — every auth call happens on the server with
 * the anon key (SUPABASE_URL / SUPABASE_ANON_KEY, no NEXT_PUBLIC_ needed).
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component: cookies are read-only there. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  })
}

export function supabaseUrl(): string {
  const v = process.env.SUPABASE_URL
  if (!v) throw new Error('SUPABASE_URL is not set')
  return v
}

export function supabaseAnonKey(): string {
  const v = process.env.SUPABASE_ANON_KEY
  if (!v) throw new Error('SUPABASE_ANON_KEY is not set')
  return v
}

/** True when the auth-backed admin can run at all (both env vars present). */
export function supabaseAuthConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}
