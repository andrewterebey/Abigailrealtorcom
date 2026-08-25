import { notFound } from 'next/navigation'
import {
  AdminAnalyticsView,
  ANALYTICS_SECTIONS,
} from '@/components/admin/admin-analytics-view'

export const metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  if (!ANALYTICS_SECTIONS[section]) notFound()
  return <AdminAnalyticsView section={section} />
}
