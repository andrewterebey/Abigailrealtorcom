import type { Block } from '@/lib/blog-markdown'

/**
 * Renders one parsed blog block with the public post typography. Shared by
 * the public post page and the admin editor's preview so what Abigail sees
 * while writing is what the site renders.
 */
export function PostBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case 'h2':
      return (
        <h2 className="mt-12 text-[26px] uppercase leading-[1.3] tracking-[0.04em] text-site-gold md:text-[30px]">
          {block.text}
        </h2>
      )
    case 'h3':
      return (
        <h3 className="mt-10 text-[20px] uppercase leading-[1.3] tracking-[0.04em] text-black md:text-[22px]">
          {block.text}
        </h3>
      )
    case 'ul':
      return (
        <ul className="mt-6 list-disc space-y-2 pl-6 font-body text-[16px] leading-[1.7] text-site-text">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'p':
    default:
      return (
        <p className="mt-6 font-body text-[16px] leading-[1.7] text-site-text">
          {block.text}
        </p>
      )
  }
}
