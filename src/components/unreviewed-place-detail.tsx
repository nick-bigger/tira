import { DirectionsButton } from '@/components/directions-button'
import { BookmarkIcon, PlusIcon } from '@/components/icons'
import { PinHeroMap } from '@/components/pin-hero-map'
import { PinIcon } from '@/components/pin-icon'
import {
  ContactBadges,
  ContactBadgesSkeleton,
  CuisineSkeleton,
  CuisineText,
  HoursDisclosure,
  HoursSkeleton,
} from '@/components/place-osm-details'
import type { OsmDetails } from '@/lib/osm-enrichment'

export interface UnreviewedPlace {
  id: string
  name: string
  location: string | null
  lat: number | null
  lng: number | null
}

export interface UnreviewedPlaceDetailProps {
  place: UnreviewedPlace
  osmDetails: OsmDetails
  osmLoading: boolean
  bookmarked: boolean
  bookmarkPending: boolean
  onToggleBookmark: () => void
  onReview: () => void
  reviewLabel?: string
  /** True when this place is already ranked under a different record (only relevant to the
   *  search-result preview, which can't yet know that until the caller checks) - hides the
   *  bookmark action, matching the ranked-place row in the search results list, which shows a
   *  tier badge instead of the bookmark/rank quick icons. */
  alreadyRanked?: boolean
}

/** Body of the "not reviewed yet" detail view - identical whether the place is a saved bookmark
 *  (/bookmark/$id) or a bare search result being previewed from the add-place overlay, so both
 *  surfaces render this same component rather than drifting into two look-alikes. */
export function UnreviewedPlaceDetail({
  place,
  osmDetails,
  osmLoading,
  bookmarked,
  bookmarkPending,
  onToggleBookmark,
  onReview,
  reviewLabel = 'Review It',
  alreadyRanked = false,
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
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-balance">{place.name}</h1>
              {osmLoading ? <CuisineSkeleton /> : <CuisineText cuisine={osmDetails.cuisine} />}
              {place.location && (
                <p className="mt-1 flex items-center gap-1 text-sm font-bold opacity-60">
                  <PinIcon className="h-3.5 w-3.5 shrink-0" />
                  {place.location}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onReview}
                aria-label={reviewLabel}
                className="brutal-xs flex h-7 w-7 items-center justify-center bg-card text-foreground"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
              {!alreadyRanked && (
                <button
                  type="button"
                  disabled={bookmarkPending}
                  onClick={onToggleBookmark}
                  aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark for later'}
                  className={`brutal-xs flex h-7 w-7 items-center justify-center bg-card disabled:opacity-40 ${bookmarked ? 'text-accent' : 'text-foreground'}`}
                >
                  <BookmarkIcon filled={bookmarked} className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {osmLoading ? (
              <ContactBadgesSkeleton />
            ) : (
              <ContactBadges website={osmDetails.website} phone={osmDetails.phone} />
            )}
            <DirectionsButton place={place} />
          </div>

          {(osmLoading || osmDetails.openingHours) && (
            <div className="mt-4">
              <p className="eyebrow mb-1.5 text-[10px] opacity-60">About</p>
              <div className="brutal-sm bg-muted p-4">
                {osmLoading ? (
                  <HoursSkeleton />
                ) : (
                  <HoursDisclosure openingHours={osmDetails.openingHours} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
