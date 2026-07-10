import { BookmarkHeroMap } from '@/components/bookmark-hero-map'
import { DirectionsButton } from '@/components/directions-button'
import { ChevronLeftIcon, MoreIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { PinIcon } from '@/components/pin-icon'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAppData } from '@/lib/app-data'
import { deleteBookmark } from '@/lib/bookmarks'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/bookmark/$id')({
  component: BookmarkDetailPage,
})

function BookmarkDetailPage() {
  const { id } = Route.useParams()
  const { bookmarks, refresh, openAdd } = useAppData()
  const router = useRouter()
  const [removing, setRemoving] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const bookmark = bookmarks.find((b) => b.id === id)

  if (!bookmark) {
    return (
      <div className="min-h-svh">
        <div className="flex items-center justify-center px-6 py-16">
          <div className="brutal bg-card p-8 text-center">
            <p className="mb-4 font-display text-xl font-bold">Couldn't find that bookmark.</p>
            <Link to="/lists" className="font-display text-sm font-bold opacity-70">
              ← Back to lists
            </Link>
          </div>
        </div>
      </div>
    )
  }

  function handleRank() {
    setMenuOpen(false)
    openAdd({
      name: bookmark!.name,
      location: bookmark!.location ?? '',
      lat: bookmark!.lat ?? undefined,
      lng: bookmark!.lng ?? undefined,
      bookmarkId: bookmark!.id,
      isManual: false,
    })
  }

  async function handleRemove() {
    setMenuOpen(false)
    setRemoving(true)
    await deleteBookmark(bookmark!.id)
    await refresh()
    router.navigate({ to: '/lists' })
  }

  const bookmarkMenu = (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="More options"
          className="brutal-xs flex h-9 w-9 items-center justify-center bg-card text-foreground"
        >
          <MoreIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="brutal-sm w-48 border-0 bg-card p-0">
        <button
          type="button"
          onClick={handleRank}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-display text-sm font-bold"
        >
          <PlusIcon className="h-3.5 w-3.5 shrink-0" />
          Rank It
        </button>
        <div className="h-[2px] bg-border" />
        <button
          type="button"
          disabled={removing}
          onClick={handleRemove}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-display text-sm font-bold text-destructive disabled:opacity-50"
        >
          <TrashIcon className="h-3.5 w-3.5 shrink-0" />
          Remove Bookmark
        </button>
      </PopoverContent>
    </Popover>
  )

  return (
    <div className="min-h-svh pb-12">
      <header className="sticky top-0 z-10 border-b-[3px] border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 sm:px-6">
          <Link
            to="/lists"
            aria-label="Back to lists"
            className="brutal-xs flex h-8 w-8 items-center justify-center bg-card text-foreground"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
          {bookmarkMenu}
        </div>
      </header>
      <div className="mx-auto max-w-5xl sm:px-6 sm:py-10">
        <div className="sm:grid sm:grid-cols-[minmax(0,440px)_1fr] sm:items-start sm:gap-8">
          <div className="relative sm:sticky sm:top-6">
            <div className="relative isolate h-64 overflow-hidden sm:h-[460px] sm:rounded-2xl sm:border-[3px] sm:border-border sm:shadow-[6px_6px_0px_var(--border)]">
              <BookmarkHeroMap bookmark={bookmark} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-card sm:hidden" />
            </div>
          </div>

          <div className="relative -mt-7 rounded-t-2xl border-t-[3px] border-border bg-card px-4 pt-5 sm:mt-0 sm:rounded-none sm:border-t-0 sm:bg-transparent sm:px-0 sm:pt-0">
            <span className="eyebrow brutal-xs inline-flex items-center gap-1.5 bg-accent px-2 py-1 text-[10px] text-accent-foreground">
              Want to Try
            </span>
            <h1 className="mt-2 font-display text-2xl font-bold text-balance">{bookmark.name}</h1>
            {bookmark.location && (
              <p className="mt-1 flex items-center gap-1 text-sm font-bold opacity-60">
                <PinIcon className="h-3.5 w-3.5 shrink-0" />
                {bookmark.location}
              </p>
            )}

            <DirectionsButton place={bookmark} />

            <button
              type="button"
              onClick={handleRank}
              className="brutal-sm mt-4 flex h-auto w-full items-center justify-center gap-2 border-0 bg-accent py-2.5 font-display text-sm font-bold text-accent-foreground"
            >
              <PlusIcon className="h-4 w-4" />
              Rank It
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
