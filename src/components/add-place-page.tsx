import { Field, FIELD_INPUT_CLASS } from '@/components/form-field'
import { BookmarkIcon, LocateIcon, PlusIcon, SearchIcon } from '@/components/icons'
import { PinIcon } from '@/components/pin-icon'
import { PlaceDetailHeader } from '@/components/place-detail-header'
import { TierIcon, type Tier } from '@/components/tier-icon'
import { TiraMark } from '@/components/tira-mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UnreviewedPlaceDetail } from '@/components/unreviewed-place-detail'
import { useAppData } from '@/lib/app-data'
import { createBookmark, deleteBookmark, type Bookmark } from '@/lib/bookmarks'
import { coordinateFor, haversineDistanceMi, type LatLng } from '@/lib/geo'
import {
  useDebouncedAddressSearch,
  useDebouncedLocationSearch,
  useDebouncedPlaceSearch,
  type LocationSuggestion,
  type PlaceSearchResult,
} from '@/lib/place-search'
import type { PlaceWithScore } from '@/lib/places'
import { listRecentViews, recordRecentView, type RecentView } from '@/lib/recent-views'
import { useGeolocation } from '@/lib/use-geolocation'
import { useLiveOsmDetails } from '@/lib/use-osm-enrichment'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'

type Step = 'search' | 'manual' | 'preview'

export interface Candidate {
  name: string
  location: string
  lat?: number
  lng?: number
  /** Set when this candidate came from "Rank it" on a bookmark - deleted once ranked. */
  bookmarkId?: string
  /** True when typed in via "add manually" rather than picked from a search result/bookmark - only these are editable later. */
  isManual: boolean
  /** OSM type+id (e.g. "osm:n123") when this candidate came from a search result/bookmark that
   *  has one - lets the place detail page fetch cuisine/website/phone/hours from OpenStreetMap. */
  osmId?: string
}

/** A search result's id is only a real OSM id in the "osm:n123" shape produced by
 *  osmIdOf() in place-search.ts - guards against passing through an unrelated internal id
 *  (e.g. a legacy recent-view row id) as if it were one. */
function realOsmId(id: string): string | undefined {
  return /^osm:[nwr]\d+$/.test(id) ? id : undefined
}

/** ~50m, in miles - treats a search result as "the same place" as an existing spot. */
const SAME_SPOT_MI = 0.03

function isSameSpot(
  a: { name: string; location: string | null; lat: number | null; lng: number | null },
  r: PlaceSearchResult,
): boolean {
  if (a.lat != null && a.lng != null) {
    if (
      haversineDistanceMi({ lat: a.lat, lng: a.lng }, { lat: r.lat, lng: r.lng }) < SAME_SPOT_MI
    ) {
      return true
    }
  }
  return (
    a.name.trim().toLowerCase() === r.name.trim().toLowerCase() &&
    (a.location ?? '').trim().toLowerCase() === r.location.trim().toLowerCase()
  )
}

/** /add - search for a place, add one manually, or jump back into a recent. Not a sheet/modal -
 *  a normal page like every other route, so it gets the persistent bottom nav and real back
 *  history like everywhere else. Picking a candidate opens the tier/compare review flow as its
 *  own overlay on top of this page, via AppShell's openReview. */
export function AddPlacePage() {
  const { byTier, bookmarks, refresh, openReview } = useAppData()
  const { position, error: geoError, locate } = useGeolocation()
  const navigate = useNavigate()
  const allPlaces = [...byTier.liked, ...byTier.okay, ...byTier.nope]

  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualLocation, setManualLocation] = useState('')
  const [manualCoord, setManualCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [locationOverride, setLocationOverride] = useState<LocationSuggestion | null>(null)
  const [bookmarkPending, setBookmarkPending] = useState<string | null>(null)
  const [recentViews, setRecentViews] = useState<RecentView[]>([])
  const [previewResult, setPreviewResult] = useState<PlaceSearchResult | null>(null)

  const searchNear = locationOverride
    ? { lat: locationOverride.lat, lng: locationOverride.lng }
    : (position ?? undefined)
  // Never fall back to an unscoped, worldwide search - without a resolved
  // location there's no basis to rank "the Costco near me" over one on the
  // other side of the planet, so hold the query until we have one.
  const nearReady = searchNear !== undefined
  const { results, loading, error } = useDebouncedPlaceSearch(nearReady ? query : '', searchNear)

  useEffect(() => {
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void listRecentViews().then(setRecentViews)
  }, [])

  // Tapping a row opens its detail view; the quick "+" button on the row (and "Review It" on
  // the detail view itself) both hand the candidate off to the review overlay.
  function selectResult(r: PlaceSearchResult) {
    void recordRecentView({ name: r.name, location: r.location, lat: r.lat, lng: r.lng })
    openReview({
      name: r.name,
      location: r.location,
      lat: r.lat,
      lng: r.lng,
      isManual: false,
      osmId: realOsmId(r.id),
    })
  }

  function openPreview(r: PlaceSearchResult) {
    setPreviewResult(r)
    setStep('preview')
    void recordRecentView({ name: r.name, location: r.location, lat: r.lat, lng: r.lng })
  }

  function confirmReview() {
    if (previewResult) selectResult(previewResult)
  }

  function viewRankedPlace(placeId: string) {
    void navigate({ to: '/place/$id', params: { id: placeId } })
    const place = allPlaces.find((p) => p.id === placeId)
    if (place) {
      void recordRecentView({
        name: place.name,
        location: place.location,
        lat: place.lat,
        lng: place.lng,
        placeId: place.id,
      })
    }
  }

  function viewBookmarkedPlace(bookmarkId: string) {
    void navigate({ to: '/bookmark/$id', params: { id: bookmarkId } })
    const bm = bookmarks.find((b) => b.id === bookmarkId)
    if (bm) {
      void recordRecentView({ name: bm.name, location: bm.location, lat: bm.lat, lng: bm.lng })
    }
  }

  async function toggleBookmark(r: PlaceSearchResult, existingBookmarkId: string | null) {
    setBookmarkPending(r.id)
    try {
      if (existingBookmarkId) {
        await deleteBookmark(existingBookmarkId)
      } else {
        await createBookmark({
          name: r.name,
          location: r.location,
          lat: r.lat,
          lng: r.lng,
          osmId: realOsmId(r.id),
        })
      }
      await refresh()
    } finally {
      setBookmarkPending(null)
    }
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault()
    if (!manualName.trim()) return
    openReview({
      name: manualName.trim(),
      location: manualLocation.trim(),
      lat: manualCoord?.lat,
      lng: manualCoord?.lng,
      isManual: true,
    })
  }

  function resetToSearch() {
    setPreviewResult(null)
    setStep('search')
  }

  // Not a sheet, so there's no built-in open/close transition - play the exit animation
  // ourselves and hold the navigation until it's finished.
  const [closing, setClosing] = useState(false)

  function closeToLists() {
    setClosing(true)
    setTimeout(() => navigate({ to: '/lists' }), 200)
  }

  const pageAnimation = closing
    ? 'animate-out fade-out slide-out-to-bottom-4 duration-200'
    : 'animate-in fade-in slide-in-from-bottom-4 duration-300'

  return (
    <div className={pageAnimation}>
      {step === 'preview' && previewResult ? (
        <PreviewStep
          result={previewResult}
          bookmark={bookmarks.find((b) => isSameSpot(b, previewResult)) ?? null}
          bookmarkPending={bookmarkPending === previewResult.id}
          onToggleBookmark={(existingBookmarkId: string | null) =>
            toggleBookmark(previewResult, existingBookmarkId)
          }
          onReview={confirmReview}
          onChange={resetToSearch}
        />
      ) : step === 'manual' ? (
        <ManualStep
          name={manualName}
          location={manualLocation}
          onNameChange={setManualName}
          onLocationChange={(loc, coord) => {
            setManualLocation(loc)
            setManualCoord(coord)
          }}
          onSubmit={handleManualSubmit}
          onBack={() => setStep('search')}
          onClose={closeToLists}
        />
      ) : (
        <SearchStep
          query={query}
          onQueryChange={setQuery}
          results={results}
          loading={loading}
          error={error}
          nearReady={nearReady}
          geoError={locationOverride ? null : geoError}
          distanceFrom={locationOverride ? null : position}
          location={locationOverride}
          onLocationChange={setLocationOverride}
          places={allPlaces}
          bookmarks={bookmarks}
          recentViews={recentViews}
          bookmarkPending={bookmarkPending}
          onSelect={selectResult}
          onPreview={openPreview}
          onViewPlace={viewRankedPlace}
          onViewBookmark={viewBookmarkedPlace}
          onToggleBookmark={toggleBookmark}
          onManual={() => setStep('manual')}
          onClose={closeToLists}
        />
      )}
    </div>
  )
}

/** Sticky title-bar header shared by the search and manual-entry steps - matches the style of
 *  the other top-level pages (Home, Your Lists). */
function StepHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b-[3px] border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 sm:px-6">
        <span className="font-display text-2xl font-bold">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="brutal-xs flex h-8 w-8 items-center justify-center bg-card text-sm font-bold"
        >
          ✕
        </button>
      </div>
    </header>
  )
}

function SearchStep({
  query,
  onQueryChange,
  results,
  loading,
  error,
  nearReady,
  geoError,
  distanceFrom,
  location,
  onLocationChange,
  places,
  bookmarks,
  recentViews,
  bookmarkPending,
  onSelect,
  onPreview,
  onViewPlace,
  onViewBookmark,
  onToggleBookmark,
  onManual,
  onClose,
}: {
  query: string
  onQueryChange: (v: string) => void
  results: PlaceSearchResult[]
  loading: boolean
  error: string | null
  nearReady: boolean
  geoError: string | null
  distanceFrom: LatLng | null
  location: LocationSuggestion | null
  onLocationChange: (v: LocationSuggestion | null) => void
  places: PlaceWithScore[]
  bookmarks: Bookmark[]
  recentViews: RecentView[]
  bookmarkPending: string | null
  onSelect: (r: PlaceSearchResult) => void
  onPreview: (r: PlaceSearchResult) => void
  onViewPlace: (placeId: string) => void
  onViewBookmark: (bookmarkId: string) => void
  onToggleBookmark: (r: PlaceSearchResult, existingBookmarkId: string | null) => void
  onManual: () => void
  onClose: () => void
}) {
  return (
    <div className="min-h-svh pb-12">
      <StepHeader title="Add a place" onClose={onClose} />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="relative mb-2.5">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-55" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search any place - cafés, bakeries, Costco..."
            className="brutal-flat w-full bg-card py-2.5 pr-3 pl-8 text-base font-bold text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:shadow-[3px_3px_0px_var(--border)] focus:outline-none md:text-sm"
          />
        </div>
        <LocationField value={location} onChange={onLocationChange} />
        <div>
          {!nearReady && !geoError && (
            <p className="px-1 py-6 text-center text-sm font-bold opacity-50">
              Finding your location...
            </p>
          )}
          {!nearReady && geoError && (
            <p className="px-1 py-6 text-center text-sm font-bold opacity-60">
              Couldn't spot you on the map - search a city above and we'll pick up from there.
            </p>
          )}
          {nearReady && !query.trim() && (
            <RecentlyViewed
              recentViews={recentViews}
              places={places}
              bookmarks={bookmarks}
              distanceFrom={distanceFrom}
              bookmarkPending={bookmarkPending}
              onSelect={onSelect}
              onPreview={onPreview}
              onViewPlace={onViewPlace}
              onViewBookmark={onViewBookmark}
              onToggleBookmark={onToggleBookmark}
            />
          )}
          {nearReady && loading && (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <ResultRowSkeleton key={i} />
              ))}
            </div>
          )}
          {nearReady && !loading && error && (
            <p className="py-6 text-center text-sm font-bold text-destructive">{error}</p>
          )}
          {nearReady && !loading && !error && query.trim() && results.length === 0 && (
            <p className="px-1 py-6 text-center text-sm font-bold opacity-60">
              Nothing turned up nearby - add it by hand below and it's yours to rank.
            </p>
          )}
          {nearReady && !loading && !error && results.length > 0 && (
            <div className="flex flex-col gap-1">
              {results.map((r) => {
                const ranked = places.find((p) => isSameSpot(p, r)) ?? null
                const bookmark = ranked ? null : (bookmarks.find((b) => isSameSpot(b, r)) ?? null)
                const dist = distanceFrom
                  ? haversineDistanceMi(distanceFrom, { lat: r.lat, lng: r.lng }).toFixed(1)
                  : null
                return (
                  <ResultRow
                    key={r.id}
                    result={r}
                    ranked={ranked}
                    bookmark={bookmark}
                    dist={dist}
                    bookmarkPending={bookmarkPending}
                    onSelect={onSelect}
                    onPreview={onPreview}
                    onViewPlace={onViewPlace}
                    onViewBookmark={onViewBookmark}
                    onToggleBookmark={onToggleBookmark}
                  />
                )
              })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onManual}
          className="mt-3 w-full border-t-2 border-dashed border-muted pt-3 text-center text-sm font-bold text-accent"
        >
          Can't find it? Enter it manually →
        </button>
      </div>
    </div>
  )
}

function recentViewToResult(rv: RecentView): PlaceSearchResult {
  const coord = coordinateFor({ id: rv.placeId ?? rv.id, lat: rv.lat, lng: rv.lng })
  return { id: rv.placeId ?? rv.id, name: rv.name, location: rv.location ?? '', ...coord }
}

/** Shown in place of the "search for a place" hint once the shared history has entries - lets
 *  either of you jump back into a place you (or the other person) just looked at. */
function RecentlyViewed({
  recentViews,
  places,
  bookmarks,
  distanceFrom,
  bookmarkPending,
  onSelect,
  onPreview,
  onViewPlace,
  onViewBookmark,
  onToggleBookmark,
}: {
  recentViews: RecentView[]
  places: PlaceWithScore[]
  bookmarks: Bookmark[]
  distanceFrom: LatLng | null
  bookmarkPending: string | null
  onSelect: (r: PlaceSearchResult) => void
  onPreview: (r: PlaceSearchResult) => void
  onViewPlace: (placeId: string) => void
  onViewBookmark: (bookmarkId: string) => void
  onToggleBookmark: (r: PlaceSearchResult, existingBookmarkId: string | null) => void
}) {
  if (recentViews.length === 0) {
    return (
      <div className="px-1 py-6 text-center">
        <TiraMark className="mx-auto mb-3 h-8 w-8 opacity-50" />
        <p className="text-sm font-bold opacity-50">
          Search for a restaurant, bakery, grocery store - anywhere you've had tiramisu.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="mb-1 px-1 font-display text-sm font-bold opacity-70">Recently Viewed</p>
      {recentViews.map((rv) => {
        const result = recentViewToResult(rv)
        const ranked = rv.placeId ? (places.find((p) => p.id === rv.placeId) ?? null) : null
        const bookmark = ranked ? null : (bookmarks.find((b) => isSameSpot(b, result)) ?? null)
        const dist = distanceFrom ? haversineDistanceMi(distanceFrom, result).toFixed(1) : null
        return (
          <ResultRow
            key={rv.id}
            result={result}
            ranked={ranked}
            bookmark={bookmark}
            dist={dist}
            bookmarkPending={bookmarkPending}
            onSelect={onSelect}
            onPreview={onPreview}
            onViewPlace={onViewPlace}
            onViewBookmark={onViewBookmark}
            onToggleBookmark={onToggleBookmark}
          />
        )
      })}
    </div>
  )
}

const TIER_BADGE_TINT: Record<Tier, string> = {
  liked: 'border-tier-liked bg-tier-liked/10 text-tier-liked',
  okay: 'border-tier-okay bg-tier-okay/10 text-tier-okay',
  nope: 'border-tier-nope bg-tier-nope/10 text-tier-nope',
}

function ResultRow({
  result,
  ranked,
  bookmark,
  dist,
  bookmarkPending,
  onSelect,
  onPreview,
  onViewPlace,
  onViewBookmark,
  onToggleBookmark,
}: {
  result: PlaceSearchResult
  ranked: PlaceWithScore | null
  bookmark: Bookmark | null
  dist: string | null
  bookmarkPending: string | null
  onSelect: (r: PlaceSearchResult) => void
  onPreview: (r: PlaceSearchResult) => void
  onViewPlace: (placeId: string) => void
  onViewBookmark: (bookmarkId: string) => void
  onToggleBookmark: (r: PlaceSearchResult, existingBookmarkId: string | null) => void
}) {
  function openDetail() {
    if (ranked) return onViewPlace(ranked.id)
    if (bookmark) return onViewBookmark(bookmark.id)
    return onPreview(result)
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 hover:bg-muted">
      <button
        type="button"
        onClick={openDetail}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <PinIcon className="h-4 w-4 shrink-0 opacity-45" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{result.name}</span>
          <span className="block truncate text-xs font-bold opacity-60">{result.location}</span>
        </span>
      </button>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {ranked ? (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${TIER_BADGE_TINT[ranked.tier]}`}
          >
            <TierIcon tier={ranked.tier} className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelect(result)}
              aria-label="Rank it"
              className="brutal-xs flex h-7 w-7 items-center justify-center bg-card"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={bookmarkPending === result.id}
              onClick={() => onToggleBookmark(result, bookmark?.id ?? null)}
              aria-label={bookmark ? 'Remove bookmark' : 'Bookmark for later'}
              className={`brutal-xs flex h-7 w-7 items-center justify-center bg-card disabled:opacity-40 ${bookmark ? 'text-accent' : ''}`}
            >
              <BookmarkIcon filled={!!bookmark} className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
        {dist && !ranked && <span className="text-[10px] font-bold opacity-55">{dist} mi</span>}
      </span>
    </div>
  )
}

function ResultRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-2.5">
      <div className="skeleton h-4 w-4 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="skeleton h-3.5 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
      </div>
      <div className="skeleton h-7 w-7 shrink-0 rounded-full" />
    </div>
  )
}

/** A lightweight "detail view" for a search result that isn't ranked or bookmarked yet - there's
 *  no persisted place to route to, so this is just another step of /add rather than its own URL.
 *  Tapping a row always lands here first; "Review It" here (or the row's own quick "+") is what
 *  hands the candidate off to the review overlay. */
function PreviewStep({
  result,
  bookmark,
  bookmarkPending,
  onToggleBookmark,
  onReview,
  onChange,
}: {
  result: PlaceSearchResult
  bookmark: Bookmark | null
  bookmarkPending: boolean
  onToggleBookmark: (existingBookmarkId: string | null) => void
  onReview: () => void
  onChange: () => void
}) {
  const { details: osmDetails } = useLiveOsmDetails(realOsmId(result.id))
  return (
    <div className="min-h-svh pb-12">
      <PlaceDetailHeader onBack={onChange} backLabel="Back to search" />
      <UnreviewedPlaceDetail
        place={result}
        osmDetails={osmDetails}
        bookmarked={!!bookmark}
        bookmarkPending={bookmarkPending}
        onToggleBookmark={() => onToggleBookmark(bookmark?.id ?? null)}
        onReview={onReview}
      />
    </div>
  )
}

/** City/place typeahead that scopes place search - defaults to the browser's current location, but searchable to any city. */
function LocationField({
  value,
  onChange,
}: {
  value: LocationSuggestion | null
  onChange: (v: LocationSuggestion | null) => void
}) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const { results, loading } = useDebouncedLocationSearch(query)
  const label = value ? value.label : 'Current Location'

  return (
    <div className="relative mb-4">
      <PinIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-45" />
      <input
        type="text"
        value={focused ? query : label}
        onFocus={() => {
          setFocused(true)
          setQuery('')
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a city"
        className="brutal-flat w-full bg-card py-2.5 pr-3 pl-8 text-base font-bold text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:shadow-[3px_3px_0px_var(--border)] focus:outline-none md:text-sm"
      />
      {focused && (
        <div className="brutal-sm absolute top-full right-0 left-0 z-20 mt-1.5 max-h-48 overflow-y-auto bg-card p-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(null)
              setFocused(false)
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-bold hover:bg-muted"
          >
            <LocateIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
            Current Location
          </button>
          {loading && <p className="px-2.5 py-2 text-xs font-bold opacity-50">Searching...</p>}
          {!loading && query.trim() && results.length === 0 && (
            <p className="px-2.5 py-2 text-xs font-bold opacity-50">No matches</p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(r)
                setFocused(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-bold hover:bg-muted"
            >
              <PinIcon className="h-3.5 w-3.5 shrink-0 opacity-45" />
              <span className="truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ManualStep({
  name,
  location,
  onNameChange,
  onLocationChange,
  onSubmit,
  onBack,
  onClose,
}: {
  name: string
  location: string
  onNameChange: (v: string) => void
  onLocationChange: (location: string, coord: { lat: number; lng: number } | null) => void
  onSubmit: (e: FormEvent) => void
  onBack: () => void
  onClose: () => void
}) {
  return (
    <div className="min-h-svh pb-12">
      <StepHeader title="Add manually" onClose={onClose} />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-md">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Field id="manual-name" label="Name">
              <Input
                id="manual-name"
                autoFocus
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Grandma's kitchen"
                className={FIELD_INPUT_CLASS}
              />
            </Field>
            <AddressField value={location} onChange={onLocationChange} />
            <Button
              type="submit"
              disabled={!name.trim()}
              className="brutal-sm mt-1 h-auto border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
            >
              Next
            </Button>
            <button
              type="button"
              onClick={onBack}
              className="text-center text-sm font-bold opacity-60"
            >
              ‹ Back to search
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

/** Address typeahead for manual entry - keeps the field free-text but offers geocoded matches so a hand-entered place can still get a real map pin. */
function AddressField({
  value,
  onChange,
}: {
  value: string
  onChange: (location: string, coord: { lat: number; lng: number } | null) => void
}) {
  const [focused, setFocused] = useState(false)
  const { results, loading } = useDebouncedAddressSearch(value)

  return (
    <div className="relative">
      <Field id="manual-location" label="Location">
        <Input
          id="manual-location"
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value, null)}
          placeholder="Search an address..."
          className={FIELD_INPUT_CLASS}
        />
      </Field>
      {focused && value.trim() && (
        <div className="brutal-sm absolute top-full right-0 left-0 z-20 mt-1.5 max-h-48 overflow-y-auto bg-card p-1">
          {loading && <p className="px-2.5 py-2 text-xs font-bold opacity-50">Searching...</p>}
          {!loading && results.length === 0 && (
            <p className="px-2.5 py-2 text-xs font-bold opacity-50">
              No matches - this will be saved as free text.
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(r.label, { lat: r.lat, lng: r.lng })
                setFocused(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-bold hover:bg-muted"
            >
              <PinIcon className="h-3.5 w-3.5 shrink-0 opacity-45" />
              <span className="truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
