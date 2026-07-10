/** Small brutal-styled loading spinner - a thick ring with one transparent segment, rotated via
 *  Tailwind's animate-spin. Used for brief "something is happening" beats, not first-load states
 *  (those get a skeleton instead - see loading-skeleton.tsx). */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-[3px] border-border border-t-transparent ${className ?? 'h-6 w-6'}`}
    />
  )
}
