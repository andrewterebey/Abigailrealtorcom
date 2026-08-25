import { Search } from 'lucide-react'
import testimonialsData from '@/content/testimonials.json'

export const metadata = { title: 'Testimonials' }

export default function AdminTestimonialsPage() {
  const { testimonials } = testimonialsData

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Testimonials</h1>
        <button
          type="button"
          title="Creating testimonials lands with the Supabase phase"
          className="cursor-not-allowed rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white opacity-90"
        >
          Add New
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 border-b border-gray-200 pb-3 text-gray-400">
        <Search className="h-4 w-4" aria-hidden />
        <input
          type="text"
          placeholder="Search..."
          className="w-64 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="w-44 py-2.5 font-medium">Author</th>
            <th className="py-2.5 font-medium">Quote</th>
            <th className="w-28 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {testimonials.map((t) => (
            <tr key={t.id} className="border-b border-gray-100 align-top">
              <td className="py-3 font-semibold">{t.author}</td>
              <td className="max-w-xl py-3 text-gray-600">
                <span className="line-clamp-2">{t.quote}</span>
              </td>
              <td className="py-3">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  Published
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="py-3 text-xs text-gray-400">
        {testimonials.length} records · editing activates with the Supabase phase
      </p>
    </div>
  )
}
