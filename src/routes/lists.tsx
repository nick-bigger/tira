import { BookmarkListView } from '@/components/bookmark-list-view'
import { BookmarkMapView } from '@/components/bookmark-map-view'
import { BOTTOM_NAV_CLEARANCE } from '@/components/bottom-nav'
import { ListIcon, MapViewIcon } from '@/components/icons'
import { PlaceListView } from '@/components/place-list-view'
import { PlaceMapView } from '@/components/place-map-view'
import type { Tier } from '@/components/tier-icon'
import { TiraMark } from '@/components/tira-mark'
import { Button } from '@/components/ui/button'
import { useAppData } from '@/lib/app-data'
import { deleteBookmark, type Bookmark } from '@/lib/bookmarks'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

type Mode = 'been' | 'want-to-try'

interface ListsSearch {
  mode?: Mode
}

export const Route = createFileRoute('/lists')({
  component: ListsPage,
  validateSearch: (search: Record<string, unknown>): ListsSearch => ({
    mode: search.mode === 'want-to-try' ? 'want-to-try' : undefined,
  }),
})

const TIER_ORDER: Tier[] = ['liked', 'okay', 'nope']

type View = 'list' | 'map'

function ListsPage() {
  const { byTier, bookmarks, refresh, openReview } = useAppData()
  const { mode: modeSearch } = Route.useSearch()
  const navigate = useNavigate()
  const allPlaces = TIER_ORDER.flatMap((t) => byTier[t])
  const mode: Mode = modeSearch ?? 'been'
  const [view, setView] = useState<View>('list')
  const [removingId, setRemovingId] = useState<string | null>(null)

  function setMode(next: Mode) {
    void navigate({ to: '/lists', search: next === 'been' ? {} : { mode: next }, replace: true })
  }

  function handleRank(bookmark: Bookmark) {
    openReview({
      name: bookmark.name,
      location: bookmark.location ?? '',
      lat: bookmark.lat ?? undefined,
      lng: bookmark.lng ?? undefined,
      bookmarkId: bookmark.id,
      isManual: false,
    })
  }

  async function handleRemoveBookmark(bookmark: Bookmark) {
    setRemovingId(bookmark.id)
    try {
      await deleteBookmark(bookmark.id)
      await refresh()
    } finally {
      setRemovingId(null)
    }
  }

  const hasContent = mode === 'been' ? allPlaces.length > 0 : bookmarks.length > 0
  const isMapView = hasContent && view === 'map'

  return (
    // min-height leaves room for the fixed BottomNav (mirrors BOTTOM_NAV_CLEARANCE) so a flex-1
    // map view below fills exactly to the nav's top edge instead of extending behind it. Uses dvh
    // (not svh) so the fill tracks the real viewport as mobile browser chrome shows/hides, instead
    // of leaving a gap once the address bar collapses and the fixed nav shifts down with it.
    <div className="flex min-h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom))] flex-col">
      <header className="sticky top-0 z-10 shrink-0 border-b-[3px] border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 sm:px-6">
          <span className="font-display text-2xl font-bold">Your Lists</span>
        </div>
        <div className="mx-auto flex max-w-5xl px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMode('been')}
            aria-pressed={mode === 'been'}
            className={`flex-1 border-b-[3px] py-2.5 text-center font-display text-sm font-bold sm:flex-none sm:px-6 ${
              mode === 'been'
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground opacity-50'
            }`}
          >
            Been
          </button>
          <button
            type="button"
            onClick={() => setMode('want-to-try')}
            aria-pressed={mode === 'want-to-try'}
            className={`flex-1 border-b-[3px] py-2.5 text-center font-display text-sm font-bold sm:flex-none sm:px-6 ${
              mode === 'want-to-try'
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground opacity-50'
            }`}
          >
            Want to Try
          </button>
        </div>
      </header>

      <main
        className={`relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col sm:px-6 sm:pt-6 sm:pb-10 ${
          isMapView ? '' : 'px-4 pt-4 pb-6'
        }`}
      >
        {!hasContent ? (
          <EmptyState mode={mode} />
        ) : (
          <>
            {mode === 'been' &&
              (view === 'list' ? (
                <PlaceListView places={allPlaces} />
              ) : (
                <PlaceMapView places={allPlaces} />
              ))}
            {mode === 'want-to-try' &&
              (view === 'list' ? (
                <BookmarkListView
                  bookmarks={bookmarks}
                  onRank={handleRank}
                  onRemove={handleRemoveBookmark}
                  removingId={removingId}
                />
              ) : (
                <BookmarkMapView
                  bookmarks={bookmarks}
                  onRank={handleRank}
                  onRemove={handleRemoveBookmark}
                  removingId={removingId}
                />
              ))}

            <button
              type="button"
              onClick={() => setView(view === 'list' ? 'map' : 'list')}
              className="brutal-sm fixed z-20 flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground"
              style={{
                // On wide screens, aligns with the max-w-5xl content column's right edge (plus
                // 1rem) instead of the raw viewport edge, matching where the button sits on mobile.
                right: 'max(1rem, env(safe-area-inset-right), calc((100vw - 64rem) / 2 + 1rem))',
                bottom: `calc(${BOTTOM_NAV_CLEARANCE} + 1rem)`,
              }}
            >
              {view === 'list' ? (
                <>
                  <MapViewIcon className="h-5 w-5 shrink-0" />
                  <span className="font-display text-sm font-bold">View Map</span>
                </>
              ) : (
                <>
                  <ListIcon className="h-5 w-5 shrink-0" />
                  <span className="font-display text-sm font-bold">View List</span>
                </>
              )}
            </button>
          </>
        )}
      </main>
    </div>
  )
}

function EmptyState({ mode }: { mode: Mode }) {
  return (
    <div className="brutal mx-auto mt-6 max-w-md bg-card p-8 text-center sm:mt-16 sm:p-10">
      <TiraMark className="mx-auto mb-3 h-10 w-10" />
      <p className="mb-2 font-display text-xl font-bold">
        {mode === 'been' ? 'No tiramisu yet.' : 'Nothing bookmarked yet.'}
      </p>
      <p className="mb-5 text-sm font-bold opacity-70">
        {mode === 'been'
          ? "Add the first place you've tried to start the rankings."
          : 'Bookmark a place from search to try it later.'}
      </p>
      <Button
        asChild
        className="brutal-sm h-auto border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
      >
        <Link to="/add" className="no-underline">
          + Add place
        </Link>
      </Button>
    </div>
  )
}
