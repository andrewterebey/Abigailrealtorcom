/**
 * Who may use /admin. Supabase Auth authenticates; this allowlist authorizes.
 * Accounts are created by hand in the Supabase dashboard (public signups are
 * off), and even a valid Supabase session is refused unless its email is in
 * ADMIN_EMAILS (comma-separated, case-insensitive). Two layers on purpose:
 * a stray account in the auth table never becomes admin access.
 */

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmails().includes(email.trim().toLowerCase())
}

/** Only ever send people to a path inside the admin — never off-site. */
export function safeAdminPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/admin') || next.startsWith('//')) return '/admin'
  if (next.startsWith('/admin/login') || next.startsWith('/admin/auth')) return '/admin'
  return next
}
