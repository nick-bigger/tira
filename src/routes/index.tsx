import { AddPlaceOverlay, type Candidate } from '@/components/add-place-overlay'
import { AppHeader } from '@/components/app-header'
import { BookmarkListView } from '@/components/bookmark-list-view'
import { BookmarkMapView } from '@/components/bookmark-map-view'
import { ListIcon, MapViewIcon } from '@/components/icons'
import { PlaceListView } from '@/components/place-list-view'
import { PlaceMapView } from '@/components/place-map-view'
import type { Tier } from '@/components/tier-icon'
import { TiraMark } from '@/components/tira-mark'
import { Button } from '@/components/ui/button'
import { deleteBookmark, listBookmarks, type Bookmark } from '@/lib/bookmarks'
import { listPlacesByTier } from '@/lib/places'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

interface IndexSearch {
  add?: true
}

export const Route = createFileRoute('/')({
  component: RankedListPage,
  loader: async () => {
    const [byTier, bookmarks] = await Promise.all([listPlacesByTier(), listBookmarks()])
    return { byTier, bookmarks }
  },
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    add: search.add === true || search.add === 'true' ? true : undefined,
  }),
})

const TIER_ORDER: Tier[] = ['liked', 'okay', 'nope']

type Mode = 'been' | 'want-to-try'
type View = 'list' | 'map'

function RankedListPage() {
  const { byTier, bookmarks } = Route.useLoaderData()
  const { add } = Route.useSearch()
  const router = useRouter()
  const allPlaces = TIER_ORDER.flatMap((t) => byTier[t])
  const [mode, setMode] = useState<Mode>('been')
  const [view, setView] = useState<View>('list')
  const [addOpen, setAddOpen] = useState(false)
  const [rankCandidate, setRankCandidate] = useState<Candidate | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (add) setAddOpen(true)
  }, [add])

  function handleAddOpenChange(next: boolean) {
    setAddOpen(next)
    if (!next) {
      setRankCandidate(null)
      if (add) void router.navigate({ to: '/', search: {}, replace: true })
    }
  }

  function handleOpenAdd() {
    setRankCandidate(null)
    setAddOpen(true)
  }

  function handleRank(bookmark: Bookmark) {
    setRankCandidate({
      name: bookmark.name,
      location: bookmark.location ?? '',
      lat: bookmark.lat ?? undefined,
      lng: bookmark.lng ?? undefined,
      bookmarkId: bookmark.id,
      isManual: false,
    })
    setAddOpen(true)
  }

  async function handleRemoveBookmark(bookmark: Bookmark) {
    setRemovingId(bookmark.id)
    try {
      await deleteBookmark(bookmark.id)
      await router.invalidate()
    } finally {
      setRemovingId(null)
    }
  }

  async function handleDataChanged() {
    await router.invalidate()
  }

  const hasContent = mode === 'been' ? allPlaces.length > 0 : bookmarks.length > 0

  return (
    <div className="min-h-svh">
      <AppHeader
        actions={
          <Button
            className="brutal-xs h-auto border-0 bg-primary px-4 py-2 font-display font-bold text-primary-foreground"
            onClick={handleOpenAdd}
          >
            + Add place
          </Button>
        }
      >
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
      </AppHeader>

      <main className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {!hasContent ? (
          <EmptyState mode={mode} onAdd={handleOpenAdd} />
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
              aria-label={view === 'list' ? 'View map' : 'View list'}
              className="brutal-sm fixed right-4 bottom-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground sm:right-8 sm:bottom-8"
            >
              {view === 'list' ? (
                <MapViewIcon className="h-5 w-5" />
              ) : (
                <ListIcon className="h-5 w-5" />
              )}
            </button>
          </>
        )}
      </main>

      <AddPlaceOverlay
        open={addOpen}
        onOpenChange={handleAddOpenChange}
        byTier={byTier}
        bookmarks={bookmarks}
        onDataChanged={handleDataChanged}
        initialCandidate={rankCandidate}
      />
    </div>
  )
}

function EmptyState({ mode, onAdd }: { mode: Mode; onAdd: () => void }) {
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
        className="brutal-sm h-auto border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
        onClick={onAdd}
      >
        + Add place
      </Button>
    </div>
  )
}
