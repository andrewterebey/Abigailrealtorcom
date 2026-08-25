import Image from 'next/image'
import { Search } from 'lucide-react'

export const metadata = { title: 'Agents' }

/** Agents — LP-style table; a single row, Abigail (from site branding). */
export default function AdminAgentsPage() {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Agents</h1>
        <button
          type="button"
          title="Single-agent site — team features aren't planned"
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
            <th className="py-2.5 font-medium">Name</th>
            <th className="w-40 py-2.5 font-medium">Phone Number</th>
            <th className="w-48 py-2.5 font-medium">Brokerage</th>
            <th className="w-32 py-2.5 font-medium">Display Order</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="py-3">
              <span className="flex items-center gap-3 font-semibold">
                <Image
                  src="/images/about-bio-portrait-agent-photo.jpg"
                  alt="Abigail Anderson"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover"
                />
                Abigail Anderson
              </span>
            </td>
            <td className="py-3 text-gray-600">(425) 236-2853</td>
            <td className="py-3 text-gray-600">John L. Scott Real Estate</td>
            <td className="py-3 text-gray-600">1</td>
          </tr>
        </tbody>
      </table>

      <p className="py-3 text-xs text-gray-400">1 record</p>
    </div>
  )
}
