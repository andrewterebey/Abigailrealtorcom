import type { Metadata } from 'next'
import { Forum, Poppins } from 'next/font/google'
import './globals.css'
import { SiteHeader } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'

const forum = Forum({
  variable: '--font-display',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

const poppins = Poppins({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://abigailrealtor.com'),
  title: {
    default: 'Abigail Anderson | Bellevue, WA Real Estate Agent',
    template: '%s | Abigail Anderson',
  },
  description:
    'Abigail Anderson is a King County real estate expert serving Bellevue, Seattle, Kirkland, Newcastle, Shoreline, and Renton with John L. Scott.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${forum.variable} ${poppins.variable} font-body text-site-text antialiased`}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
