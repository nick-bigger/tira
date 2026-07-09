import { CheckIcon, SearchIcon, SortIcon } from '@/components/icons'
import { PinIcon } from '@/components/pin-icon'
import type { Tier } from '@/components/tier-icon'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { placeDistanceMi } from '@/lib/geo'
import type { PlaceWithScore } from '@/lib/places'
import { useGeolocation } from '@/lib/use-geolocation'
import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

const TIER_BADGE_OUTLINE: Record<Tier, string> = {
  liked: 'text-tier-liked border-tier-liked',
  okay: 'text-tier-okay border-tier-okay',
  nope: 'text-tier-nope border-tier-nope',
}

type SortBy = 'score' | 'distance' | 'date'

const SORT_LABEL: Record<SortBy, string> = {
  score: 'Score',
  distance: 'Distance',
  date: 'Date added',
}

export interface PlaceListViewProps {
  places: PlaceWithScore[]
}

export function PlaceListView({ places }: PlaceListViewProps) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('score')
  const [sortOpen, setSortOpen] = useState(false)
  const { position, locate } = useGeolocation()

  useEffect(() => {
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Always keyed off the score-sorted order (the prop's natural order), independent of
  // whatever sort the user has picked for display, so "#3" still means #3 by score.
  const ranks = useMemo(() => {
    const map = new Map<string, number>()
    places.forEach((place, i) => map.set(place.id, i + 1))
    return map
  }, [places])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return places
    return places.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q),
    )
  }, [places, query])

  const sorted = useMemo(() => {
    if (sortBy === 'date') {
      return [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }
    if (sortBy === 'distance' && position) {
      return [...filtered].sort(
        (a, b) => placeDistanceMi(a, position) - placeDistanceMi(b, position),
      )
    }
    return filtered
  }, [filtered, sortBy, position])

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-55" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places or locations..."
            className="brutal-flat h-10 w-full bg-card py-2 pr-3 pl-8 text-base font-bold text-foreground placeholder:text-muted-foreground focus:shadow-[3px_3px_0px_var(--border)] focus:outline-none md:text-sm"
          />
        </div>
        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Sort places"
              className="brutal-flat flex h-10 shrink-0 items-center gap-1.5 bg-card px-3 text-sm font-bold text-foreground"
            >
              <SortIcon className="h-3.5 w-3.5" />
              {SORT_LABEL[sortBy]}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="brutal-sm w-44 border-0 bg-card p-0"
          >
            {(Object.keys(SORT_LABEL) as SortBy[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setSortBy(option)
                  setSortOpen(false)
                }}
                aria-pressed={sortBy === option}
                className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-display text-sm font-bold ${
                  sortBy === option ? 'text-primary' : ''
                }`}
              >
                <CheckIcon
                  className={`h-3.5 w-3.5 shrink-0 ${sortBy === option ? '' : 'invisible'}`}
                />
                {SORT_LABEL[option]}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {filtered.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm font-bold opacity-60">
          No spots match your search.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((place) => (
            <Link
              key={place.id}
              to="/place/$id"
              params={{ id: place.id }}
              className="brutal-sm relative block bg-card pt-[0.85rem] pr-[4.75rem] pb-[2.1rem] pl-4 text-foreground no-underline"
            >
              <span
                className={`absolute top-[0.85rem] right-[0.7rem] min-w-12 rounded-sm border-2 bg-card px-[0.6rem] py-[0.3rem] text-center font-display text-[0.95rem] font-bold ${TIER_BADGE_OUTLINE[place.tier]}`}
              >
                {place.score.toFixed(1)}
              </span>
              <p className="truncate font-extrabold">
                {ranks.get(place.id)}. {place.name}
              </p>
              {place.location && (
                <p className="mt-1 flex items-center gap-1 truncate text-xs font-bold opacity-60">
                  <PinIcon className="h-3 w-3 shrink-0" />
                  {place.location}
                </p>
              )}
              {position && (
                <span className="absolute bottom-[0.65rem] left-4 text-[11px] font-bold text-muted-foreground">
                  {placeDistanceMi(place, position).toFixed(1)} mi
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
