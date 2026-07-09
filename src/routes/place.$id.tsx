import { AppHeader } from '@/components/app-header'
import { Field, FIELD_INPUT_CLASS } from '@/components/form-field'
import {
  CalendarIcon,
  ChevronLeftIcon,
  CompassIcon,
  MoreIcon,
  PencilIcon,
  TrashIcon,
} from '@/components/icons'
import { NotesEditor } from '@/components/notes-editor'
import { PinIcon } from '@/components/pin-icon'
import { PlaceHeroMap } from '@/components/place-hero-map'
import { RerankSheet } from '@/components/rerank-sheet'
import { TIER_LABEL, TierIcon, type Tier } from '@/components/tier-icon'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  deletePlace,
  listPlacesByTier,
  updatePlaceDetails,
  type PlaceWithScore,
} from '@/lib/places'
import { TIER_BANDS } from '@/lib/ranking'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useState, type FormEvent } from 'react'

export const Route = createFileRoute('/place/$id')({
  component: PlaceDetailPage,
  loader: () => listPlacesByTier(),
})

const TIER_BG: Record<Tier, string> = {
  liked: 'bg-tier-liked text-tier-liked-foreground',
  okay: 'bg-tier-okay text-tier-okay-foreground',
  nope: 'bg-tier-nope text-tier-nope-foreground',
}

function directionsUrl(place: PlaceWithScore): string {
  // Older/manually-entered places may only have a mocked coordinate (see geo.ts) - sending
  // those straight to Maps would point at a random spot, so fall back to a text search
  // instead of the coordinate whenever we don't have a real lat/lng on file.
  if (place.lat !== null && place.lng !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  }
  const query = [place.name, place.location].filter(Boolean).join(', ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
}

function PlaceDetailPage() {
  const { id } = Route.useParams()
  const byTier = Route.useLoaderData()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [rerankOpen, setRerankOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)

  const place = [...byTier.liked, ...byTier.okay, ...byTier.nope].find((p) => p.id === id)

  if (!place) {
    return (
      <div className="min-h-svh">
        <AppHeader />
        <div className="flex items-center justify-center px-6 py-16">
          <div className="brutal bg-card p-8 text-center">
            <p className="mb-4 font-display text-xl font-bold">Couldn't find that place.</p>
            <Link to="/" className="font-display text-sm font-bold opacity-70">
              ← Back to rankings
            </Link>
          </div>
        </div>
      </div>
    )
  }

  async function handleDelete() {
    setMenuOpen(false)
    if (!confirm(`Delete "${place!.name}"? This can't be undone.`)) return
    setDeleting(true)
    await deletePlace(place!.id)
    await router.invalidate()
    router.navigate({ to: '/' })
  }

  async function handleDataChanged() {
    await router.invalidate()
  }

  if (editing) {
    return (
      <div className="min-h-svh">
        <AppHeader>
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <button
              type="button"
              aria-label="Cancel editing"
              onClick={() => setEditing(false)}
              className="brutal-xs flex h-8 w-8 shrink-0 items-center justify-center bg-card text-foreground"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <p className="eyebrow truncate text-xs opacity-60">Editing {place.name}</p>
          </div>
        </AppHeader>
        <div className="px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-md">
            <EditForm
              place={place}
              onCancel={() => setEditing(false)}
              onSaved={async () => {
                setEditing(false)
                await router.invalidate()
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  const placeMenu = (
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
          onClick={() => {
            setMenuOpen(false)
            setRerankOpen(true)
          }}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-display text-sm font-bold"
        >
          <TierIcon tier={place.tier} className="h-3.5 w-3.5 shrink-0" />
          Rank Again
        </button>
        {place.isManual && (
          <>
            <div className="h-[2px] bg-border" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setEditing(true)
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-display text-sm font-bold"
            >
              <PencilIcon className="h-3.5 w-3.5 shrink-0" />
              Edit Details
            </button>
          </>
        )}
        <div className="h-[2px] bg-border" />
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-display text-sm font-bold text-destructive disabled:opacity-50"
        >
          <TrashIcon className="h-3.5 w-3.5 shrink-0" />
          Delete ranking
        </button>
      </PopoverContent>
    </Popover>
  )

  return (
    <div className="min-h-svh pb-12">
      <AppHeader>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link
            to="/"
            aria-label="Back to rankings"
            className="brutal-xs flex h-8 w-8 items-center justify-center bg-card text-foreground"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
          {placeMenu}
        </div>
      </AppHeader>
      <div className="mx-auto max-w-5xl sm:px-6 sm:py-10">
        <div className="sm:grid sm:grid-cols-[minmax(0,440px)_1fr] sm:items-start sm:gap-8">
          <div className="relative sm:sticky sm:top-6">
            <div className="relative isolate h-64 overflow-hidden sm:h-[460px] sm:rounded-2xl sm:border-[3px] sm:border-border sm:shadow-[6px_6px_0px_var(--border)]">
              <PlaceHeroMap place={place} score={place.score} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-card sm:hidden" />
            </div>
          </div>

          <div className="relative -mt-7 rounded-t-2xl border-t-[3px] border-border bg-card px-4 pt-5 sm:mt-0 sm:rounded-none sm:border-t-0 sm:bg-transparent sm:px-0 sm:pt-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span
                  className={`eyebrow brutal-xs inline-flex items-center gap-1.5 px-2 py-1 text-[10px] ${TIER_BG[place.tier]}`}
                >
                  <TierIcon tier={place.tier} className="h-3 w-3" />
                  {TIER_LABEL[place.tier]} · #{place.rankInTier} of {byTier[place.tier].length}
                </span>
                <h1 className="mt-2 font-display text-2xl font-bold text-balance">{place.name}</h1>
                {place.location && (
                  <p className="mt-1 flex items-center gap-1 text-sm font-bold opacity-60">
                    <PinIcon className="h-3.5 w-3.5 shrink-0" />
                    {place.location}
                  </p>
                )}
              </div>
              <div
                className={`brutal-sm flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full ${TIER_BG[place.tier]}`}
              >
                <span className="font-display text-xl font-bold">{place.score.toFixed(1)}</span>
                <span className="eyebrow text-[9px]">Score</span>
              </div>
            </div>

            <a
              href={directionsUrl(place)}
              target="_blank"
              rel="noreferrer"
              className="brutal-sm mt-4 flex h-auto items-center justify-center gap-2 border-0 bg-primary py-2.5 font-display text-sm font-bold text-primary-foreground"
            >
              <CompassIcon className="h-4 w-4" />
              Get Directions
            </a>

            <ScoreGauge place={place} tierCount={byTier[place.tier].length} />

            {place.visitedDate && (
              <div className="brutal-sm mt-4 flex items-center gap-3 bg-muted px-4 py-3">
                <span className="brutal-xs flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="eyebrow text-[10px] opacity-60">Visited</p>
                  <p className="text-sm font-bold">
                    {format(new Date(`${place.visitedDate}T00:00:00`), 'PPP')}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="eyebrow mb-1.5 text-[10px] opacity-60">Notes</p>
              {place.notes ? (
                <button
                  type="button"
                  onClick={() => setNotesOpen(true)}
                  className="brutal-sm relative w-full bg-muted p-4 text-left hover:opacity-90"
                >
                  <span className="absolute -top-2.5 left-3 font-serif text-4xl leading-none text-secondary">
                    "
                  </span>
                  <p className="pt-1 text-sm leading-relaxed font-bold">{place.notes}</p>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setNotesOpen(true)}
                  className="w-full rounded-[var(--radius-md)] border-2 border-dashed border-border/50 bg-transparent p-4 text-left text-sm font-bold opacity-60 hover:border-border hover:opacity-90"
                >
                  No notes yet - add some.
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <NotesEditor
        open={notesOpen}
        onOpenChange={setNotesOpen}
        place={place}
        onSaved={handleDataChanged}
      />

      <RerankSheet
        open={rerankOpen}
        onOpenChange={setRerankOpen}
        place={place}
        byTier={byTier}
        onRanked={handleDataChanged}
      />
    </div>
  )
}

const GAUGE_MIN = TIER_BANDS.nope[1] + (TIER_BANDS.okay[0] - TIER_BANDS.nope[1]) / 2
const GAUGE_MAX = TIER_BANDS.okay[1] + (TIER_BANDS.liked[0] - TIER_BANDS.okay[1]) / 2

function ScoreGauge({ place, tierCount }: { place: PlaceWithScore; tierCount: number }) {
  const markerPct = Math.min(100, Math.max(0, (place.score / 10) * 100))
  const nopePct = (GAUGE_MIN / 10) * 100
  const okayPct = ((GAUGE_MAX - GAUGE_MIN) / 10) * 100

  return (
    <div className="brutal-sm mt-4 bg-muted p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-sm font-bold">
          #{place.rankInTier}{' '}
          <span className="font-normal opacity-60">
            of {tierCount} in {TIER_LABEL[place.tier]}
          </span>
        </p>
        <p className="font-display text-sm font-bold">
          {place.score.toFixed(1)} <span className="font-normal opacity-60">/ 10</span>
        </p>
      </div>
      <div className="relative flex h-3.5 overflow-visible rounded-full border-[2.5px] border-border">
        <div className="h-full rounded-l-full bg-tier-nope" style={{ width: `${nopePct}%` }} />
        <div className="h-full bg-tier-okay" style={{ width: `${okayPct}%` }} />
        <div
          className="h-full rounded-r-full bg-tier-liked"
          style={{ width: `${100 - nopePct - okayPct}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-[3px] border-border bg-card"
          style={{ left: `${markerPct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="eyebrow mt-1.5 flex justify-between text-[9px] font-bold opacity-55">
        <span>Didn't Like It</span>
        <span>It Was Okay</span>
        <span>Liked It</span>
      </div>
    </div>
  )
}

function EditForm({
  place,
  onCancel,
  onSaved,
}: {
  place: PlaceWithScore
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(place.name)
  const [location, setLocation] = useState(place.location ?? '')
  const [visitedDate, setVisitedDate] = useState(place.visitedDate ?? '')
  const [saving, setSaving] = useState(false)

  const visitedDateObj = visitedDate ? new Date(`${visitedDate}T00:00:00`) : undefined

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await updatePlaceDetails(place.id, {
      name: name.trim(),
      location: location.trim(),
      notes: place.notes ?? '',
      visitedDate,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="brutal bg-card p-6">
      <div className="flex flex-col gap-3">
        <Field id="edit-name" label="Name">
          <Input
            id="edit-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </Field>
        <Field id="edit-location" label="Location">
          <Input
            id="edit-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </Field>
        <Field id="edit-visited" label="Visited">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="edit-visited"
                type="button"
                variant="ghost"
                className={`${FIELD_INPUT_CLASS} justify-start hover:bg-transparent`}
              >
                {visitedDateObj ? (
                  format(visitedDateObj, 'PPP')
                ) : (
                  <span className="opacity-50">Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="brutal-sm w-auto border-0 p-0 shadow-none" align="start">
              <Calendar
                mode="single"
                selected={visitedDateObj}
                onSelect={(date) => setVisitedDate(date ? format(date, 'yyyy-MM-dd') : '')}
              />
            </PopoverContent>
          </Popover>
        </Field>
      </div>
      <div className="mt-5 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={onCancel}
          className="brutal-sm h-auto flex-1 bg-card py-2.5 font-display font-bold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving || !name.trim()}
          className="brutal-sm h-auto flex-1 border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
        >
          Save
        </Button>
      </div>
    </form>
  )
}
