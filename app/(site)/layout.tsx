import { SiteHeader } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'

/**
 * Layout for every public-facing page. The `(site)` route group exists so the
 * admin area (`/admin`) can opt out of the public chrome — URLs are unchanged.
 */
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  )
}
