import { AdminAnalyticsView } from '@/components/admin/admin-analytics-view'

export const metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

/** Default analytics view — LP opens on Building Awareness. */
export default function AdminAnalyticsPage() {
  return <AdminAnalyticsView section="building-awareness" />
}
