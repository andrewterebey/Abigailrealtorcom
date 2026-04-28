/**
 * Small amber tab attached to the left edge of a section image — matches the
 * "DISCOVER" / "EXCLUSIVE" badges the live site overlays on the sellers and
 * options city photos. Parent must be `position: relative` (the section
 * image-container in those pages already is).
 */
export function SectionPillBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="absolute left-0 top-12 z-10 inline-flex items-center bg-site-gold px-3 py-1.5 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-white"
      // Slight overlap onto the edge of the image, matching live's flush-left positioning.
    >
      {children}
    </span>
  )
}
