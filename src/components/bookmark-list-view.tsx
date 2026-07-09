import { BookmarkIcon, PlusIcon, SearchIcon } from '@/components/icons'
import { PinIcon } from '@/components/pin-icon'
import type { Bookmark } from '@/lib/bookmarks'
import { placeDistanceMi } from '@/lib/geo'
import { useGeolocation } from '@/lib/use-geolocation'
import { useEffect, useMemo, useState } from 'react'

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
  const { position, locate } = useGeolocation()

  useEffect(() => {
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return bookmarks
    return bookmarks.filter(
      (b) => b.name.toLowerCase().includes(q) || (b.location ?? '').toLowerCase().includes(q),
    )
  }, [bookmarks, query])

  return (
    <div>
      <div className="relative mb-6">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-55" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places or locations..."
          className="brutal-flat h-10 w-full bg-card py-2 pr-3 pl-8 text-base font-bold text-foreground placeholder:text-muted-foreground focus:shadow-[3px_3px_0px_var(--border)] focus:outline-none md:text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm font-bold opacity-60">
          {bookmarks.length === 0
            ? 'Nothing bookmarked yet - save a place from search to try it later.'
            : 'No spots match your search.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="brutal-sm flex items-center gap-3 bg-card px-4 py-3 text-foreground"
            >
              <div className="min-w-0 flex-1">
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
              </div>
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
      )}
    </div>
  )
}
