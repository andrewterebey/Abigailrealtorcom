import { AdminContentEmpty } from '@/components/admin/admin-content-empty'

export const metadata = { title: 'Properties' }

/** LP's "Properties" are hand-made property pages, distinct from the MLS
 *  feed. The rebuild serves all listings from the feed (see /admin/listings),
 *  so this stays empty unless custom property pages are ever wanted. */
export default function AdminPropertiesPage() {
  return <AdminContentEmpty title="Properties" addLabel="Add New" />
}
