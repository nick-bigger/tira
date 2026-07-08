import { Field, FIELD_INPUT_CLASS } from '@/components/form-field'
import { PinIcon } from '@/components/pin-icon'
import { TIER_LABEL, TierIcon } from '@/components/tier-icon'
import { TiraMark } from '@/components/tira-mark'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import {
  deletePlace,
  listPlacesByTier,
  updatePlaceDetails,
  type PlaceWithScore,
} from '@/lib/places'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useState, type FormEvent } from 'react'

export const Route = createFileRoute('/place/$id')({
  component: PlaceDetailPage,
  loader: () => listPlacesByTier(),
})

const TIER_BG: Record<string, string> = {
  liked: 'bg-tier-liked text-tier-liked-foreground',
  okay: 'bg-tier-okay text-tier-okay-foreground',
  nope: 'bg-tier-nope text-tier-nope-foreground',
}

function PlaceDetailPage() {
  const { id } = Route.useParams()
  const byTier = Route.useLoaderData()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const place = [...byTier.liked, ...byTier.okay, ...byTier.nope].find((p) => p.id === id)

  if (!place) {
    return (
      <div className="flex min-h-svh items-center justify-center px-6">
        <div className="brutal bg-card p-8 text-center">
          <p className="mb-4 font-display text-xl font-bold">Couldn't find that place.</p>
          <Link to="/" className="font-display text-sm font-bold opacity-70">
            ← Back to rankings
          </Link>
        </div>
      </div>
    )
  }

  async function handleDelete() {
    if (!confirm(`Delete "${place!.name}"? This can't be undone.`)) return
    setDeleting(true)
    await deletePlace(place!.id)
    await router.invalidate()
    router.navigate({ to: '/' })
  }

  return (
    <div className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="brutal-xs bg-card px-3 py-1.5">
            ←
          </Link>
          {!editing && (
            <Button
              variant="ghost"
              className="brutal-xs h-auto bg-card px-3 py-1.5 opacity-70"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <EditForm
            place={place}
            onCancel={() => setEditing(false)}
            onSaved={async () => {
              setEditing(false)
              await router.invalidate()
            }}
          />
        ) : (
          <ViewCard place={place} onDelete={handleDelete} deleting={deleting} />
        )}
      </div>
    </div>
  )
}

function ViewCard({
  place,
  onDelete,
  deleting,
}: {
  place: PlaceWithScore
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <div className="brutal bg-card p-6">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="brutal-sm mx-auto mb-3 flex h-16 w-16 items-center justify-center bg-background">
          <TiraMark className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold">{place.name}</h1>
        {place.location && (
          <p className="flex items-center gap-1 text-sm font-bold opacity-60">
            <PinIcon className="h-3.5 w-3.5 shrink-0" />
            {place.location}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <span className={`eyebrow brutal-xs px-2 py-1 ${TIER_BG[place.tier]}`}>
            {place.score.toFixed(1)}
          </span>
          <span
            className={`eyebrow brutal-xs flex items-center gap-1 px-2 py-1 ${TIER_BG[place.tier]}`}
          >
            <TierIcon tier={place.tier} className="h-3 w-3" />
            {TIER_LABEL[place.tier]} · #{place.rankInTier}
          </span>
        </div>
      </div>

      {place.visitedDate && (
        <div className="brutal-sm mb-4 bg-background p-4">
          <p className="eyebrow mb-1 text-[10px] opacity-60">Visited</p>
          <p className="text-sm font-bold">
            {format(new Date(`${place.visitedDate}T00:00:00`), 'PPP')}
          </p>
        </div>
      )}

      {place.notes && (
        <div className="brutal-sm bg-background p-4">
          <p className="eyebrow mb-1 text-[10px] opacity-60">Notes</p>
          <p className="text-sm leading-relaxed font-bold">{place.notes}</p>
        </div>
      )}

      <Button
        variant="ghost"
        disabled={deleting}
        onClick={onDelete}
        className="brutal-sm mt-5 h-auto w-full border-0 bg-destructive py-2.5 font-display font-bold text-destructive-foreground"
      >
        Delete
      </Button>
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
  const [notes, setNotes] = useState(place.notes ?? '')
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
      notes: notes.trim(),
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
        <Field id="edit-notes" label="Notes">
          <Textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${FIELD_INPUT_CLASS} resize-none`}
          />
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
