import { DirectionsButton } from '@/components/directions-button'
import { BookmarkIcon } from '@/components/icons'
import { PinHeroMap } from '@/components/pin-hero-map'
import { PinIcon } from '@/components/pin-icon'
import { Button } from '@/components/ui/button'

export interface UnreviewedPlace {
  id: string
  name: string
  location: string | null
  lat: number | null
  lng: number | null
}

export interface UnreviewedPlaceDetailProps {
  place: UnreviewedPlace
  bookmarked: boolean
  bookmarkPending: boolean
  onToggleBookmark: () => void
  onReview: () => void
  reviewLabel?: string
}

/** Body of the "not reviewed yet" detail view - identical whether the place is a saved bookmark
 *  (/bookmark/$id) or a bare search result being previewed from the add-place overlay, so both
 *  surfaces render this same component rather than drifting into two look-alikes. */
export function UnreviewedPlaceDetail({
  place,
  bookmarked,
  bookmarkPending,
  onToggleBookmark,
  onReview,
  reviewLabel = 'Review It',
}: UnreviewedPlaceDetailProps) {
  return (
    <div className="mx-auto max-w-5xl sm:px-6 sm:py-10">
      <div className="sm:grid sm:grid-cols-[minmax(0,440px)_1fr] sm:items-start sm:gap-8">
        <div className="relative sm:sticky sm:top-6">
          <div className="relative isolate h-64 overflow-hidden sm:h-[460px] sm:rounded-2xl sm:border-[3px] sm:border-border sm:shadow-[6px_6px_0px_var(--border)]">
            <PinHeroMap place={place} className="h-full w-full" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-card sm:hidden" />
          </div>
        </div>

        <div className="relative -mt-7 rounded-t-2xl border-t-[3px] border-border bg-card px-4 pt-5 sm:mt-0 sm:rounded-none sm:border-t-0 sm:bg-transparent sm:px-0 sm:pt-0">
          <span className="eyebrow brutal-xs inline-flex items-center gap-1.5 bg-accent px-2 py-1 text-[10px] text-accent-foreground">
            Want to Try
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold text-balance">{place.name}</h1>
          {place.location && (
            <p className="mt-1 flex items-center gap-1 text-sm font-bold opacity-60">
              <PinIcon className="h-3.5 w-3.5 shrink-0" />
              {place.location}
            </p>
          )}

          <DirectionsButton place={place} />

          <button
            type="button"
            disabled={bookmarkPending}
            onClick={onToggleBookmark}
            className={`brutal-sm mt-3 flex h-auto w-full items-center justify-center gap-2 border-0 py-2.5 font-display text-sm font-bold disabled:opacity-50 ${
              bookmarked ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground'
            }`}
          >
            <BookmarkIcon filled={bookmarked} className="h-4 w-4" />
            {bookmarked ? 'Bookmarked' : 'Bookmark for later'}
          </button>

          <Button
            type="button"
            onClick={onReview}
            className="brutal-sm mt-3 h-auto w-full border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
          >
            {reviewLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
