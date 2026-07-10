import { BookmarkIcon, CheckIcon, PlusIcon, SearchIcon, SortIcon } from '@/components/icons'
import { PinIcon } from '@/components/pin-icon'
import { Spinner } from '@/components/spinner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Bookmark } from '@/lib/bookmarks'
import { placeDistanceMi } from '@/lib/geo'
import { useGeolocation } from '@/lib/use-geolocation'
import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

type SortBy = 'distance' | 'date'

const SORT_LABEL: Record<SortBy, string> = {
  distance: 'Distance',
  date: 'Date added',
}

export interface BookmarkListViewProps {
  bookmarks: Bookmark[]
  onRank: (bookmark: Bookmark) => void
  onRemove: (bookmark: Bookmark) => void
  removingId: string | null
}

export function BookmarkListView({
  bookmarks,
  onRank,
  onRemove,
  removingId,
}: BookmarkListViewProps) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [pendingSortBy, setPendingSortBy] = useState<SortBy | null>(null)
  const [sortOpen, setSortOpen] = useState(false)
  const { position, locate } = useGeolocation()
  const sortPending = pendingSortBy !== null

  useEffect(() => {
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sorting is instant, but the list only re-sorts once the spinner overlay has shown for a
  // beat - applying it immediately (with the spinner just layered on top) let the reorder
  // happen visibly underneath, which looked broken rather than "loading".
  useEffect(() => {
    if (!pendingSortBy) return
    const next = pendingSortBy
    const t = setTimeout(() => {
      setSortBy(next)
      setPendingSortBy(null)
    }, 1000)
    return () => clearTimeout(t)
  }, [pendingSortBy])

  function handleSortChange(option: SortBy) {
    setSortOpen(false)
    if (option === sortBy) return
    setPendingSortBy(option)
  }

  const displaySortBy = pendingSortBy ?? sortBy

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return bookmarks
    return bookmarks.filter(
      (b) => b.name.toLowerCase().includes(q) || (b.location ?? '').toLowerCase().includes(q),
    )
  }, [bookmarks, query])

  const sorted = useMemo(() => {
    if (sortBy === 'distance' && position) {
      return [...filtered].sort(
        (a, b) => placeDistanceMi(a, position) - placeDistanceMi(b, position),
      )
    }
    // Bookmarks already load newest-first (see listBookmarks), so "date" needs no re-sort.
    return filtered
  }, [filtered, sortBy, position])

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-55" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places or locations..."
            className="brutal-flat h-12 w-full bg-card py-3 pr-3 pl-8 text-base font-bold text-foreground placeholder:text-muted-foreground focus:shadow-[3px_3px_0px_var(--border)] focus:outline-none md:text-sm"
          />
        </div>
        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Sort bookmarks"
              className="brutal-flat flex h-12 shrink-0 items-center gap-1.5 bg-card px-3 text-sm font-bold text-foreground"
            >
              <SortIcon className="h-3.5 w-3.5" />
              {SORT_LABEL[displaySortBy]}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="brutal-sm w-44 border-0 bg-card p-0"
          >
            {(Object.keys(SORT_LABEL) as SortBy[]).map((option) => {
              const disabled = option === 'distance' && !position
              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSortChange(option)}
                  aria-pressed={displaySortBy === option}
                  className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-display text-sm font-bold ${
                    displaySortBy === option ? 'text-primary' : ''
                  } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <CheckIcon
                    className={`h-3.5 w-3.5 shrink-0 ${displaySortBy === option ? '' : 'invisible'}`}
                  />
                  {SORT_LABEL[option]}
                </button>
              )
            })}
          </PopoverContent>
        </Popover>
      </div>

      {filtered.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm font-bold opacity-60">
          {bookmarks.length === 0
            ? 'Nothing bookmarked yet - save a place from search to try it later.'
            : 'No spots match your search.'}
        </p>
      ) : (
        <div className="relative">
          {sortPending && (
            <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/70 pt-16">
              <Spinner className="h-7 w-7" />
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {sorted.map((b) => (
              <div
                key={b.id}
                className="brutal-sm brutal-hover flex items-center gap-3 bg-card px-4 py-3 text-foreground"
              >
                <Link
                  to="/bookmark/$id"
                  params={{ id: b.id }}
                  className="min-w-0 flex-1 text-foreground no-underline"
                >
                  <p className="truncate font-extrabold">{b.name}</p>
                  {b.location && (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs font-bold opacity-60">
                      <PinIcon className="h-3 w-3 shrink-0" />
                      {b.location}
                    </p>
                  )}
                  {position && (
                    <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                      {placeDistanceMi(b, position).toFixed(1)} mi
                    </p>
                  )}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRank(b)}
                    aria-label="Rank it"
                    className="brutal-xs flex h-8 w-8 items-center justify-center bg-card"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={removingId === b.id}
                    onClick={() => onRemove(b)}
                    aria-label="Remove bookmark"
                    className="brutal-xs flex h-8 w-8 items-center justify-center bg-card text-accent disabled:opacity-40"
                  >
                    <BookmarkIcon filled className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
