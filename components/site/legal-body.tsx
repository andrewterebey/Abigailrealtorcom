import type { LegalBlock } from '@/lib/legal-content'

/**
 * Render a verbatim legal document (DMCA / Terms / Privacy). Styling is
 * intentionally minimal so the text reads the same as on the live site.
 */
export function LegalBody({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <div className="space-y-5 font-body text-[15px] leading-[1.75] text-site-text md:text-[16px]">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h1':
            // The h1 is rendered by the page itself (page title). Drop the
            // duplicate body h1 emitted by the source markdown.
            return null
          case 'h2':
            return (
              <h2
                key={i}
                className="mt-10 text-[26px] uppercase leading-[1.3] tracking-[0.04em] text-black md:text-[30px]"
              >
                {block.text}
              </h2>
            )
          case 'h3':
            return (
              <h3
                key={i}
                className="mt-8 text-[18px] uppercase leading-[1.3] tracking-[0.04em] text-black md:text-[21px]"
              >
                {block.text}
              </h3>
            )
          case 'p':
            return (
              <p
                key={i}
                dangerouslySetInnerHTML={{ __html: block.markup }}
              />
            )
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-2 pl-6">
                {block.items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ol>
            )
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-2 pl-6">
                {block.items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
