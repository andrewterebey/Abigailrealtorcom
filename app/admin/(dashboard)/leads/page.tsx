import { ArrowUpDown, Columns, Filter, Search } from 'lucide-react'

export const metadata = { title: 'Leads' }

/**
 * Leads table — layout cloned from LP's Contacts screen.
 * ROUGH DRAFT: the rows below are SAMPLE DATA (clearly fake) so the layout is
 * reviewable; real rows arrive when /api/contact starts writing to the
 * contact_submissions table.
 */

const SAMPLE_LEADS = [
  { name: 'Sample Buyer', email: 'sample.buyer@example.com', phone: '(555) 010-0001', type: 'Lead', source: 'Contact form', form: 'Contact page', tag: 'Buyer' },
  { name: 'Sample Seller', email: 'sample.seller@example.com', phone: '(555) 010-0002', type: 'Lead', source: 'Contact form', form: 'Home valuation', tag: 'Seller' },
  { name: 'Sample Inquiry', email: 'sample.inquiry@example.com', phone: '(555) 010-0003', type: 'Lead', source: 'Contact form', form: 'Listing inquiry', tag: '' },
]

const TABS = ['All', 'Contact', 'Valuation', 'Newsletter']

export default function AdminContactsPage() {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Leads</h1>
        <button
          type="button"
          title="Manual contacts land with the Supabase phase"
          className="cursor-not-allowed rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white opacity-90"
        >
          Add contact
        </button>
      </div>

      <div className="mt-4 rounded-lg bg-blue-50 px-4 py-2.5 text-[13px] text-blue-900">
        Sample data — real contact-form submissions appear here once
        submission storage is wired (Supabase phase).
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[13px]">
          {TABS.map((tab, i) => (
            <span
              key={tab}
              className={`rounded-lg px-3 py-1.5 ${
                i === 0
                  ? 'bg-[#f2f2f3] font-medium text-gray-900'
                  : 'text-gray-500'
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[13px] text-gray-700">
          <Search className="h-4 w-4 text-gray-500" aria-hidden />
          <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5">
            <Filter className="h-3.5 w-3.5" aria-hidden /> Filters
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5">
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden /> Sort
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5">
            <Columns className="h-3.5 w-3.5" aria-hidden /> Columns
          </span>
        </div>
      </div>

      <table className="mt-3 w-full text-[13px]">
        <thead>
          <tr className="border-y border-gray-200 text-left text-gray-500">
            <th className="w-10 py-2.5">
              <input type="checkbox" aria-label="Select all" disabled />
            </th>
            <th className="py-2.5 font-medium">Name</th>
            <th className="py-2.5 font-medium">Email</th>
            <th className="py-2.5 font-medium">Phone number</th>
            <th className="py-2.5 font-medium">Type</th>
            <th className="py-2.5 font-medium">Source</th>
            <th className="py-2.5 font-medium">Form</th>
            <th className="py-2.5 font-medium">Tags</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_LEADS.map((lead) => (
            <tr key={lead.email} className="border-b border-gray-100">
              <td className="py-3">
                <input type="checkbox" aria-label={`Select ${lead.name}`} disabled />
              </td>
              <td className="py-3">
                <span className="flex items-center gap-2.5 font-medium">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-[11px]">
                    {lead.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')}
                  </span>
                  {lead.name}
                </span>
              </td>
              <td className="py-3 text-gray-600">{lead.email}</td>
              <td className="py-3 text-gray-600">{lead.phone}</td>
              <td className="py-3">
                <span className="rounded-md bg-[#f2f2f3] px-2 py-1">{lead.type}</span>
              </td>
              <td className="py-3">
                <span className="rounded-md bg-[#f2f2f3] px-2 py-1">{lead.source}</span>
              </td>
              <td className="py-3 text-gray-600">{lead.form}</td>
              <td className="py-3">
                {lead.tag && (
                  <span className="rounded-md bg-[#f2f2f3] px-2 py-1">{lead.tag}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="py-3 text-xs text-gray-400">{SAMPLE_LEADS.length} sample records</p>
    </div>
  )
}
