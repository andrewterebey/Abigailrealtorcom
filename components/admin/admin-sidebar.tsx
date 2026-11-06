'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, FileText, Home, Map, PanelLeft, Users } from 'lucide-react'

/**
 * Left navigation for the admin area, in the Luxury Presence dashboard's
 * style (Abigail's current CMS) but limited to the sections this site has
 * a use for — see docs/superpowers/specs/2026-11-05-admin-dashboard-plan.md
 * §2–3 for what was cut and why. Add a section here only when it has a page
 * that does something.
 */

type NavChild = { label: string; href: string }
type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Children auto-expand while the pathname is inside `base`. */
  base?: string
  children?: NavChild[]
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: Home },
  { label: 'Leads', href: '/admin/leads', icon: Users },
  { label: 'Listings', href: '/admin/listings', icon: Map },
  {
    label: 'Content',
    href: '/admin/content/blog-posts',
    icon: FileText,
    base: '/admin/content',
    children: [
      { label: 'Blog Posts', href: '/admin/content/blog-posts' },
      { label: 'Testimonials', href: '/admin/content/testimonials' },
      { label: 'Neighborhoods', href: '/admin/content/neighborhoods' },
    ],
  },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
]

export function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname === href

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col bg-[#f7f7f8] text-[13px]">
      <div className="flex items-center gap-2 px-3 pt-4 pb-5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-[11px] font-semibold text-white">
          AA
        </span>
        <span className="grow font-medium text-gray-900">Abigail Anderson</span>
        <PanelLeft className="h-4 w-4 text-gray-400" aria-hidden />
      </div>

      <nav className="grow overflow-y-auto px-2" aria-label="Admin">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon
            const open = item.base ? pathname.startsWith(item.base) : false
            const active = item.base ? open : isActive(item.href)
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${
                    active && !item.children
                      ? 'bg-[#e9e9eb] font-medium text-gray-900'
                      : 'text-gray-700 hover:bg-[#ededef]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                  {item.label}
                </Link>
                {item.children && open && (
                  <ul className="mt-0.5 mb-1 ml-4 space-y-0.5 border-l border-gray-200 pl-3">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className={`block rounded-lg px-2 py-1.5 ${
                            isActive(child.href)
                              ? 'bg-[#e9e9eb] font-medium text-gray-900'
                              : 'text-gray-700 hover:bg-[#ededef]'
                          }`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-[11px] font-medium text-rose-900">
            AA
          </span>
          <span className="font-medium text-gray-900">Abigail Anderson</span>
        </div>
      </div>
    </aside>
  )
}
