import { ChevronLeftIcon } from '@/components/icons'
import type { ReactNode } from 'react'

export interface PlaceDetailHeaderProps {
  onBack: () => void
  backLabel?: string
  /** True (default) reserves the device's top safe-area inset - for a real routed page that
   *  starts at the very top of the viewport. Pass false when embedding this header inside a
   *  sheet/overlay that already reserves that inset itself, and pull up into its padding so the
   *  header still sits flush at the top instead of doubling the gap. */
  insetTop?: boolean
  right?: ReactNode
}

/** Sticky back-chevron header shared by the ranked-place page, the bookmark page, and the
 *  in-sheet preview for a not-yet-saved search result - so all three "detail" surfaces read as
 *  the same page, not three look-alikes. */
export function PlaceDetailHeader({
  onBack,
  backLabel = 'Back',
  insetTop = true,
  right,
}: PlaceDetailHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-10 shrink-0 border-b-[3px] border-border bg-background ${insetTop ? '' : '-mt-5'}`}
    >
      <div
        className={`mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-2.5 sm:px-6 ${
          insetTop ? 'pt-[max(0.625rem,env(safe-area-inset-top))]' : 'pt-2.5'
        }`}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="brutal-xs flex h-8 w-8 items-center justify-center bg-card text-foreground"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {right}
      </div>
    </header>
  )
}
