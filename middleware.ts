import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isAllowedAdmin } from '@/lib/admin-auth'

/**
 * Gate for the admin. Every request under /admin and /api/admin must carry a
 * valid Supabase session whose email is on the ADMIN_EMAILS allowlist;
 * anything else is sent to the login page. The session cookie is refreshed
 * here on each request (the @supabase/ssr pattern), so server components can
 * read it without touching cookies themselves.
 *
 * Public exceptions: the login and forgot-password pages and the email-link
 * callback. /admin/reset-password needs a session (the callback creates one).
 */

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/auth/confirm']

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const isPublic = PUBLIC_ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    // Misconfigured deploy: fail closed. The admin is never reachable without
    // an auth backend.
    if (isPublic) return NextResponse.next({ request })
    return new NextResponse('Admin is not configured on this deployment.', {
      status: 503,
      headers: { 'content-type': 'text/plain' },
    })
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser() checks the token with the auth server; getSession() would only
  // decode the cookie, which a forged cookie could satisfy.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const allowed = isAllowedAdmin(user?.email)

  if (isPublic) {
    // Already signed in and allowed? The login page is pointless — go in.
    if (allowed && pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return response
  }

  if (user && !allowed) {
    // Authenticated with Supabase but not an admin: end the session so the
    // cookie doesn't keep bouncing them, then explain on the login page.
    await supabase.auth.signOut()
    const login = new URL('/admin/login', request.url)
    login.searchParams.set('error', 'not-allowed')
    const redirect = NextResponse.redirect(login)
    for (const c of response.cookies.getAll()) redirect.cookies.set(c)
    return redirect
  }

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const login = new URL('/admin/login', request.url)
    login.searchParams.set('next', pathname + search)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
