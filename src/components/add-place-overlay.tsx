import { Field, FIELD_INPUT_CLASS } from '@/components/form-field'
import { BookmarkIcon, LocateIcon, PlusIcon, SearchIcon } from '@/components/icons'
import { PinIcon } from '@/components/pin-icon'
import { TIER_LABEL, TierIcon, type Tier } from '@/components/tier-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { createBookmark, deleteBookmark, type Bookmark } from '@/lib/bookmarks'
import { haversineDistanceMi, type LatLng } from '@/lib/geo'
import {
  useDebouncedAddressSearch,
  useDebouncedLocationSearch,
  useDebouncedPlaceSearch,
  type LocationSuggestion,
  type PlaceSearchResult,
} from '@/lib/place-search'
import { createPlace, type PlaceWithScore } from '@/lib/places'
import {
  applyComparison,
  compareIndex,
  estimatedRounds,
  initComparison,
  insertionIndex,
  scoreFor,
  type ComparisonOutcome,
  type ComparisonState,
} from '@/lib/ranking'
import { useGeolocation } from '@/lib/use-geolocation'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'

type Step = 'search' | 'manual' | 'tier' | 'compare' | 'saved'

export interface Candidate {
  name: string
  location: string
  lat?: number
  lng?: number
  /** Set when this candidate came from "Rank it" on a bookmark - deleted once ranked. */
  bookmarkId?: string
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

interface SavedInfo {
  tier: Tier
  rank: number
  score: number
}

export interface AddPlaceOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  byTier: Record<Tier, PlaceWithScore[]>
  bookmarks: Bookmark[]
  /** Called after a place is saved, or a bookmark is created/removed - refreshes the loader data. */
  onDataChanged: () => void | Promise<void>
  /** Pre-fills the candidate and jumps straight to the tier step - used by "Rank it" from a bookmark. */
  initialCandidate?: Candidate | null
}

export function AddPlaceOverlay({
  open,
  onOpenChange,
  byTier,
  bookmarks,
  onDataChanged,
  initialCandidate,
}: AddPlaceOverlayProps) {
  const { position, error: geoError, locate } = useGeolocation()
  const navigate = useNavigate()
  const allPlaces = [...byTier.liked, ...byTier.okay, ...byTier.nope]

  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualLocation, setManualLocation] = useState('')
  const [manualCoord, setManualCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [tier, setTier] = useState<Tier | null>(null)
  const [compareState, setCompareState] = useState<ComparisonState | null>(null)
  const [history, setHistory] = useState<ComparisonState[]>([])
  const [round, setRound] = useState(1)
  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState<SavedInfo | null>(null)
  const [locationOverride, setLocationOverride] = useState<LocationSuggestion | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [bookmarkPending, setBookmarkPending] = useState<string | null>(null)

  const searchNear = locationOverride
    ? { lat: locationOverride.lat, lng: locationOverride.lng }
    : (position ?? undefined)
  // Never fall back to an unscoped, worldwide search - without a resolved
  // location there's no basis to rank "the Costco near me" over one on the
  // other side of the planet, so hold the query until we have one.
  const nearReady = searchNear !== undefined
  const { results, loading, error } = useDebouncedPlaceSearch(nearReady ? query : '', searchNear)

  useEffect(() => {
    if (open) locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // "Rank it" from a bookmark - skip straight to the tier step with a pre-set candidate.
  useEffect(() => {
    if (open && initialCandidate) {
      setCandidate(initialCandidate)
      setStep('tier')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCandidate])

  // Reset after the close transition finishes so the sheet doesn't flash back
  // to "search" while it's still animating out.
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setStep('search')
      setQuery('')
      setManualName('')
      setManualLocation('')
      setManualCoord(null)
      setCandidate(null)
      setTier(null)
      setCompareState(null)
      setHistory([])
      setRound(1)
      setSaving(false)
      setSavedInfo(null)
      setLocationOverride(null)
      setSaveError(null)
    }, 250)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (step !== 'saved') return
    const t = setTimeout(() => onOpenChange(false), 1400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const existingInTier = tier ? byTier[tier] : []

  function selectResult(r: PlaceSearchResult) {
    setCandidate({ name: r.name, location: r.location, lat: r.lat, lng: r.lng })
    setStep('tier')
  }

  function viewRankedPlace(placeId: string) {
    onOpenChange(false)
    void navigate({ to: '/place/$id', params: { id: placeId } })
  }

  async function toggleBookmark(r: PlaceSearchResult, existingBookmarkId: string | null) {
    setBookmarkPending(r.id)
    try {
      if (existingBookmarkId) {
        await deleteBookmark(existingBookmarkId)
      } else {
        await createBookmark({ name: r.name, location: r.location, lat: r.lat, lng: r.lng })
      }
      await onDataChanged()
    } finally {
      setBookmarkPending(null)
    }
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault()
    if (!manualName.trim()) return
    setCandidate({
      name: manualName.trim(),
      location: manualLocation.trim(),
      lat: manualCoord?.lat,
      lng: manualCoord?.lng,
    })
    setStep('tier')
  }

  async function saveWithIndex(chosenTier: Tier, index: number) {
    if (!candidate) return
    setSaving(true)
    setSaveError(null)
    try {
      await createPlace({
        name: candidate.name,
        location: candidate.location,
        notes: '',
        visitedDate: '',
        tier: chosenTier,
        insertionIndex: index,
        lat: candidate.lat,
        lng: candidate.lng,
      })
      if (candidate.bookmarkId) {
        await deleteBookmark(candidate.bookmarkId)
      }
      const tierCount = byTier[chosenTier].length + 1
      setSavedInfo({
        tier: chosenTier,
        rank: index + 1,
        score: scoreFor(chosenTier, index, tierCount),
      })
      setStep('saved')
      await onDataChanged()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save - try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleTierPick(chosenTier: Tier) {
    setTier(chosenTier)
    setSaveError(null)
    const existingCount = byTier[chosenTier].length
    if (existingCount === 0) {
      void saveWithIndex(chosenTier, 0)
      return
    }
    setCompareState(initComparison(existingCount))
    setHistory([])
    setRound(1)
    setStep('compare')
  }

  function handleChoice(outcome: ComparisonOutcome) {
    if (!tier || !compareState) return
    const next = applyComparison(compareState, outcome)
    const nextIndex = compareIndex(next)
    if (nextIndex === null) {
      void saveWithIndex(tier, insertionIndex(next))
      return
    }
    setSaveError(null)
    setHistory((h) => [...h, compareState])
    setCompareState(next)
    setRound((r) => r + 1)
  }

  function handleUndo() {
    setSaveError(null)
    setHistory((h) => {
      if (h.length === 0) return h
      setCompareState(h[h.length - 1])
      setRound((r) => Math.max(1, r - 1))
      return h.slice(0, -1)
    })
  }

  function resetToSearch() {
    setTier(null)
    setCompareState(null)
    setHistory([])
    setCandidate(null)
    setSaveError(null)
    setStep('search')
  }

  function handleClose() {
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {step === 'search' && (
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
            bookmarkPending={bookmarkPending}
            onSelect={selectResult}
            onViewPlace={viewRankedPlace}
            onToggleBookmark={toggleBookmark}
            onManual={() => setStep('manual')}
            onClose={handleClose}
          />
        )}
        {step === 'manual' && (
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
            onClose={handleClose}
          />
        )}
        {step === 'tier' && candidate && (
          <TierStep
            candidate={candidate}
            onPick={handleTierPick}
            onChange={resetToSearch}
            onClose={handleClose}
            disabled={saving}
            error={saveError}
          />
        )}
        {step === 'compare' && candidate && tier && compareState && (
          <CompareStep
            candidate={candidate}
            tier={tier}
            existing={existingInTier}
            compareState={compareState}
            round={round}
            canUndo={history.length > 0}
            onChoice={handleChoice}
            onUndo={handleUndo}
            onChange={resetToSearch}
            onClose={handleClose}
            disabled={saving}
            error={saveError}
          />
        )}
        {step === 'saved' && savedInfo && candidate && (
          <SavedStep candidate={candidate} info={savedInfo} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <SheetClose asChild>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="brutal-xs flex h-7 w-7 shrink-0 items-center justify-center bg-card text-sm font-bold"
      >
        ✕
      </button>
    </SheetClose>
  )
}

function SelectedPlaceHeader({
  candidate,
  onChange,
  onClose,
}: {
  candidate: Candidate
  onChange: () => void
  onClose: () => void
}) {
  return (
    <div className="brutal-sm mb-4 flex items-center justify-between gap-2 bg-background px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-display text-base font-bold">{candidate.name}</p>
        {candidate.location && (
          <p className="flex items-center gap-1 truncate text-xs font-bold opacity-60">
            <PinIcon className="h-3 w-3 shrink-0" />
            {candidate.location}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <button type="button" onClick={onChange} className="text-xs font-bold text-accent">
          Change
        </button>
        <CloseButton onClose={onClose} />
      </div>
    </div>
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
  bookmarkPending,
  onSelect,
  onViewPlace,
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
  bookmarkPending: string | null
  onSelect: (r: PlaceSearchResult) => void
  onViewPlace: (placeId: string) => void
  onToggleBookmark: (r: PlaceSearchResult, existingBookmarkId: string | null) => void
  onManual: () => void
  onClose: () => void
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <SheetTitle>Add a place</SheetTitle>
        <CloseButton onClose={onClose} />
      </div>
      <SheetDescription className="sr-only">
        Search for a place to add and rank it against ones you've already tried.
      </SheetDescription>
      <div className="relative mb-2.5 shrink-0">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-55" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search any place - cafés, bakeries, Costco..."
          className="brutal-flat w-full bg-background py-2.5 pr-3 pl-8 text-sm font-bold text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:shadow-[3px_3px_0px_var(--border)] focus:outline-none"
        />
      </div>
      <LocationField value={location} onChange={onLocationChange} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!nearReady && !geoError && (
          <p className="px-1 py-6 text-center text-sm font-bold opacity-50">
            Finding your location...
          </p>
        )}
        {!nearReady && geoError && (
          <p className="px-1 py-6 text-center text-sm font-bold opacity-60">
            Couldn't get your location - search a city above to continue.
          </p>
        )}
        {nearReady && !query.trim() && (
          <p className="px-1 py-6 text-center text-sm font-bold opacity-50">
            Search for a restaurant, bakery, grocery store - anywhere you've had tiramisu.
          </p>
        )}
        {nearReady && loading && (
          <p className="py-6 text-center text-sm font-bold opacity-60">Searching...</p>
        )}
        {nearReady && !loading && error && (
          <p className="py-6 text-center text-sm font-bold text-destructive">{error}</p>
        )}
        {nearReady && !loading && !error && query.trim() && results.length === 0 && (
          <p className="px-1 py-6 text-center text-sm font-bold opacity-60">
            No matches nearby - try "add manually" below.
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
                <div
                  key={r.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 hover:bg-muted"
                >
                  <button
                    type="button"
                    onClick={() => (ranked ? onViewPlace(ranked.id) : onSelect(r))}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <PinIcon className="h-4 w-4 shrink-0 opacity-45" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{r.name}</span>
                      <span className="block truncate text-xs font-bold opacity-60">
                        {r.location}
                      </span>
                    </span>
                  </button>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {ranked ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-tier-liked bg-tier-liked/10 text-tier-liked">
                        <TierIcon tier="liked" className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelect(r)}
                          aria-label="Rank it"
                          className="brutal-xs flex h-7 w-7 items-center justify-center bg-card"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={bookmarkPending === r.id}
                          onClick={() => onToggleBookmark(r, bookmark?.id ?? null)}
                          aria-label={bookmark ? 'Remove bookmark' : 'Bookmark for later'}
                          className={`brutal-xs flex h-7 w-7 items-center justify-center bg-card disabled:opacity-40 ${bookmark ? 'text-accent' : ''}`}
                        >
                          <BookmarkIcon filled={!!bookmark} className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                    {dist && !ranked && (
                      <span className="text-[10px] font-bold opacity-55">{dist} mi</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onManual}
        className="mt-3 shrink-0 border-t-2 border-dashed border-muted pt-3 text-center text-sm font-bold text-accent"
      >
        Can't find it? Enter it manually →
      </button>
    </>
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
    <div className="relative mb-3 shrink-0">
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
        className="brutal-flat w-full bg-background py-2.5 pr-3 pl-8 text-sm font-bold text-foreground placeholder:text-muted-foreground placeholder:opacity-60 focus:shadow-[3px_3px_0px_var(--border)] focus:outline-none"
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
    <>
      <div className="mb-4 flex items-center justify-between">
        <SheetTitle>Add manually</SheetTitle>
        <CloseButton onClose={onClose} />
      </div>
      <SheetDescription className="sr-only">
        Enter a place's name and location by hand when it can't be found in search.
      </SheetDescription>
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
        <button type="button" onClick={onBack} className="text-center text-sm font-bold opacity-60">
          ‹ Back to search
        </button>
      </form>
    </>
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

const TIER_STYLE: Record<Tier, string> = {
  liked: 'bg-tier-liked text-tier-liked-foreground',
  okay: 'bg-tier-okay text-tier-okay-foreground',
  nope: 'bg-tier-nope text-tier-nope-foreground',
}
const TIER_HINT: Record<Tier, string> = {
  liked: 'would happily order again',
  okay: 'fine, nothing special',
  nope: 'probably skip next time',
}

function TierStep({
  candidate,
  onPick,
  onChange,
  onClose,
  disabled,
  error,
}: {
  candidate: Candidate
  onPick: (tier: Tier) => void
  onChange: () => void
  onClose: () => void
  disabled: boolean
  error: string | null
}) {
  return (
    <>
      <SelectedPlaceHeader candidate={candidate} onChange={onChange} onClose={onClose} />
      <SheetTitle className="mb-1 text-lg">How was it?</SheetTitle>
      <SheetDescription className="mb-4">
        Pick the group it belongs in - you'll fine-tune the exact rank next.
      </SheetDescription>
      {error && <p className="mb-3 text-sm font-bold text-destructive">{error}</p>}
      <div className="flex flex-col gap-3">
        {(['liked', 'okay', 'nope'] as Tier[]).map((t) => (
          <Button
            key={t}
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => onPick(t)}
            className={`brutal-sm flex h-auto items-center justify-start gap-3 border-0 px-4 py-3 text-left hover:opacity-90 ${TIER_STYLE[t]}`}
          >
            <span className="brutal-xs flex h-8 w-8 shrink-0 items-center justify-center bg-card text-foreground">
              <TierIcon tier={t} className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="block font-display font-bold">{TIER_LABEL[t]}</span>
              <span className="text-xs font-normal opacity-80">{TIER_HINT[t]}</span>
            </span>
          </Button>
        ))}
      </div>
    </>
  )
}

function CompareStep({
  candidate,
  tier,
  existing,
  compareState,
  round,
  canUndo,
  onChoice,
  onUndo,
  onChange,
  onClose,
  disabled,
  error,
}: {
  candidate: Candidate
  tier: Tier
  existing: PlaceWithScore[]
  compareState: ComparisonState
  round: number
  canUndo: boolean
  onChoice: (outcome: ComparisonOutcome) => void
  onUndo: () => void
  onChange: () => void
  onClose: () => void
  disabled: boolean
  error: string | null
}) {
  const mid = compareIndex(compareState)
  const against = mid !== null ? existing[mid] : null
  const totalRounds = Math.max(estimatedRounds(existing.length), 1)

  if (!against) return null

  return (
    <>
      <SelectedPlaceHeader candidate={candidate} onChange={onChange} onClose={onClose} />
      <SheetTitle className="mb-1 text-center text-xl">Which do you prefer?</SheetTitle>
      <SheetDescription className="eyebrow mb-5 text-center text-xs">
        Comparing within {TIER_LABEL[tier]} · round {round} of ~{totalRounds}
      </SheetDescription>
      {error && <p className="mb-3 text-center text-sm font-bold text-destructive">{error}</p>}
      <div className="mb-3 flex items-stretch gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoice('new')}
          className="brutal-sm flex-1 border-0 bg-background p-3 text-center hover:bg-background/80 disabled:opacity-50"
        >
          <p className="eyebrow brutal-xs mx-auto mb-2 inline-block bg-secondary px-2 py-0.5 text-[10px]">
            NEW
          </p>
          <p className="font-display text-base font-extrabold">{candidate.name}</p>
          {candidate.location && (
            <p className="mt-1 text-xs font-bold opacity-60">{candidate.location}</p>
          )}
        </button>
        <div className="flex items-center font-display text-sm font-bold opacity-60">or</div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoice('existing')}
          className="brutal-sm flex-1 border-0 bg-background p-3 text-center hover:bg-background/80 disabled:opacity-50"
        >
          <p className="eyebrow brutal-xs mx-auto mb-2 inline-block bg-muted px-2 py-0.5 text-[10px]">
            #{mid! + 1} IN TIER
          </p>
          <p className="font-display text-base font-extrabold">{against.name}</p>
          {against.location && (
            <p className="mt-1 text-xs font-bold opacity-60">{against.location}</p>
          )}
        </button>
      </div>
      <div className="flex items-center justify-between text-xs font-bold">
        <button
          type="button"
          disabled={disabled || !canUndo}
          onClick={onUndo}
          className="text-accent disabled:opacity-30"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoice('tie')}
          className="brutal-xs bg-card px-3 py-1.5 opacity-70 disabled:opacity-30"
        >
          Too tough
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoice('tie')}
          className="text-accent disabled:opacity-30"
        >
          Skip ↷
        </button>
      </div>
    </>
  )
}

function SavedStep({ candidate, info }: { candidate: Candidate; info: SavedInfo }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span
        className={`brutal-sm mb-3 flex h-12 w-12 items-center justify-center ${TIER_STYLE[info.tier]}`}
      >
        <TierIcon tier={info.tier} className="h-6 w-6" />
      </span>
      <SheetTitle className="mb-1">Saved!</SheetTitle>
      <SheetDescription>
        {candidate.name} · #{info.rank} in {TIER_LABEL[info.tier]} · Score {info.score.toFixed(1)}
      </SheetDescription>
    </div>
  )
}
