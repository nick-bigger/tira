import { Field, FIELD_INPUT_CLASS } from '@/components/form-field'
import { PinIcon } from '@/components/pin-icon'
import { TIER_LABEL, TierIcon, type Tier } from '@/components/tier-icon'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { createPlace, listPlacesByTier, type Place } from '@/lib/places'
import {
  applyComparison,
  compareIndex,
  estimatedRounds,
  initComparison,
  insertionIndex,
  type ComparisonState,
} from '@/lib/ranking'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useState, type FormEvent } from 'react'

export const Route = createFileRoute('/add')({
  component: AddPlacePage,
  loader: () => listPlacesByTier(),
})

type Step = 'details' | 'tier' | 'compare'

interface Details {
  name: string
  location: string
  notes: string
  visitedDate: string
}

const STEP_LABELS: Record<Step, string> = {
  details: 'Details',
  tier: 'Tier',
  compare: 'Compare',
}
const STEP_ORDER: Step[] = ['details', 'tier', 'compare']

function AddPlacePage() {
  const byTier = Route.useLoaderData()
  const router = useRouter()

  const [step, setStep] = useState<Step>('details')
  const [details, setDetails] = useState<Details>({
    name: '',
    location: '',
    notes: '',
    visitedDate: '',
  })
  const [tier, setTier] = useState<Tier | null>(null)
  const [compareState, setCompareState] = useState<ComparisonState | null>(null)
  const [round, setRound] = useState(1)
  const [saving, setSaving] = useState(false)

  const existingInTier = tier ? byTier[tier] : []

  async function saveWithIndex(chosenTier: Tier, index: number) {
    setSaving(true)
    await createPlace({
      name: details.name.trim(),
      location: details.location.trim(),
      notes: details.notes.trim(),
      visitedDate: details.visitedDate,
      tier: chosenTier,
      insertionIndex: index,
    })
    await router.invalidate()
    router.navigate({ to: '/' })
  }

  function handleDetailsSubmit(e: FormEvent) {
    e.preventDefault()
    if (!details.name.trim()) return
    setStep('tier')
  }

  function handleTierPick(chosenTier: Tier) {
    setTier(chosenTier)
    const existingCount = byTier[chosenTier].length
    if (existingCount === 0) {
      void saveWithIndex(chosenTier, 0)
      return
    }
    setCompareState(initComparison(existingCount))
    setRound(1)
    setStep('compare')
  }

  function handleChoice(newPlaceIsBetter: boolean) {
    if (!tier || !compareState) return
    const next = applyComparison(compareState, newPlaceIsBetter)
    const nextIndex = compareIndex(next)
    if (nextIndex === null) {
      void saveWithIndex(tier, insertionIndex(next))
      return
    }
    setCompareState(next)
    setRound((r) => r + 1)
  }

  return (
    <div className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="font-display text-sm font-bold opacity-70">
            ← Back
          </Link>
          <StepIndicator current={step} />
        </div>

        {step === 'details' && (
          <DetailsStep details={details} onChange={setDetails} onSubmit={handleDetailsSubmit} />
        )}

        {step === 'tier' && <TierStep onPick={handleTierPick} disabled={saving} />}

        {step === 'compare' && tier && compareState && (
          <CompareStep
            newName={details.name}
            newLocation={details.location}
            tier={tier}
            existing={existingInTier}
            compareState={compareState}
            round={round}
            onChoice={handleChoice}
            disabled={saving}
          />
        )}
      </div>
    </div>
  )
}

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEP_ORDER.indexOf(current)
  return (
    <div className="eyebrow flex items-center gap-1.5 text-xs">
      {STEP_ORDER.map((s, i) => (
        <span key={s} className={i <= currentIdx ? 'opacity-100' : 'opacity-35'}>
          {STEP_LABELS[s]}
          {i < STEP_ORDER.length - 1 && <span className="mx-1.5">→</span>}
        </span>
      ))}
    </div>
  )
}

function DetailsStep({
  details,
  onChange,
  onSubmit,
}: {
  details: Details
  onChange: (d: Details) => void
  onSubmit: (e: FormEvent) => void
}) {
  const visitedDateObj = details.visitedDate
    ? new Date(`${details.visitedDate}T00:00:00`)
    : undefined

  return (
    <form onSubmit={onSubmit} className="brutal bg-card p-6">
      <p className="mb-4 font-display text-xl font-bold">Where'd you have tiramisu?</p>
      <div className="flex flex-col gap-3">
        <Field id="place-name" label="Name">
          <Input
            id="place-name"
            autoFocus
            required
            value={details.name}
            onChange={(e) => onChange({ ...details, name: e.target.value })}
            placeholder="Café Milano"
            className={FIELD_INPUT_CLASS}
          />
        </Field>
        <Field id="place-location" label="Location">
          <Input
            id="place-location"
            value={details.location}
            onChange={(e) => onChange({ ...details, location: e.target.value })}
            placeholder="Brooklyn, NY"
            className={FIELD_INPUT_CLASS}
          />
        </Field>
        <Field id="place-visited" label="Visited">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="place-visited"
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
                onSelect={(date) =>
                  onChange({ ...details, visitedDate: date ? format(date, 'yyyy-MM-dd') : '' })
                }
              />
            </PopoverContent>
          </Popover>
        </Field>
        <Field id="place-notes" label="Notes">
          <Textarea
            id="place-notes"
            value={details.notes}
            onChange={(e) => onChange({ ...details, notes: e.target.value })}
            placeholder="How was it?"
            rows={3}
            className={`${FIELD_INPUT_CLASS} resize-none`}
          />
        </Field>
      </div>
      <Button
        type="submit"
        disabled={!details.name.trim()}
        className="brutal-sm mt-5 h-auto w-full border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
      >
        Next
      </Button>
    </form>
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

function TierStep({ onPick, disabled }: { onPick: (tier: Tier) => void; disabled: boolean }) {
  return (
    <div className="brutal bg-card p-6">
      <p className="mb-1 font-display text-xl font-bold">How was it?</p>
      <p className="mb-5 text-sm font-bold opacity-60">
        Pick the group it belongs in - you'll fine-tune the exact rank next.
      </p>
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
    </div>
  )
}

function CompareStep({
  newName,
  newLocation,
  tier,
  existing,
  compareState,
  round,
  onChoice,
  disabled,
}: {
  newName: string
  newLocation: string
  tier: Tier
  existing: Place[]
  compareState: ComparisonState
  round: number
  onChoice: (newPlaceIsBetter: boolean) => void
  disabled: boolean
}) {
  const mid = compareIndex(compareState)
  const against = mid !== null ? existing[mid] : null
  const totalRounds = Math.max(estimatedRounds(existing.length), 1)

  if (!against) return null

  return (
    <div className="brutal bg-card p-6">
      <p className="mb-1 text-center font-display text-xl font-bold">Which tiramisu wins?</p>
      <p className="eyebrow mb-5 text-center text-xs opacity-60">
        Comparing within {TIER_LABEL[tier]} · round {round} of ~{totalRounds}
      </p>
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => onChoice(true)}
          className="brutal-sm block h-auto items-start justify-start bg-background p-4 text-left hover:bg-background/80"
        >
          <p className="eyebrow brutal-xs mb-1 inline-block bg-secondary px-2 py-0.5 text-[10px]">
            NEW
          </p>
          <p className="text-lg font-extrabold">{newName}</p>
          {newLocation && (
            <p className="flex items-center gap-1 text-xs font-bold opacity-60">
              <PinIcon className="h-3 w-3 shrink-0" />
              {newLocation}
            </p>
          )}
        </Button>
        <div className="text-center font-display text-sm font-bold opacity-60">vs</div>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => onChoice(false)}
          className="brutal-sm block h-auto items-start justify-start bg-background p-4 text-left hover:bg-background/80"
        >
          <p className="eyebrow brutal-xs mb-1 inline-block bg-muted px-2 py-0.5 text-[10px]">
            #{mid! + 1} IN TIER
          </p>
          <p className="text-lg font-extrabold">{against.name}</p>
          {against.location && (
            <p className="flex items-center gap-1 text-xs font-bold opacity-60">
              <PinIcon className="h-3 w-3 shrink-0" />
              {against.location}
            </p>
          )}
        </Button>
      </div>
    </div>
  )
}
