import type { Candidate } from '@/components/add-place-page'
import { Confetti } from '@/components/celebration'
import { TierIcon, type Tier } from '@/components/tier-icon'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { deleteBookmark } from '@/lib/bookmarks'
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
import { useEffect, useState } from 'react'

type Step = 'tier' | 'compare' | 'saved'

interface SavedInfo {
  tier: Tier
  rank: number
  score: number
}

export interface ReviewSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: Candidate | null
  byTier: Record<Tier, PlaceWithScore[]>
  onSaved: () => void | Promise<void>
}

/** "How was it?" -> pairwise-comparison flow for a brand-new place. Opened as its own compact
 *  overlay on top of whichever page or sheet the user reviewed it from (a search preview, a
 *  bookmark's detail page, a bookmark's list row) rather than living inside the search flow
 *  itself - see AddPlaceOverlay's onReviewCandidate and AppShell's openReview. */
export function ReviewSheet({ open, onOpenChange, candidate, byTier, onSaved }: ReviewSheetProps) {
  const [step, setStep] = useState<Step>('tier')
  const [tier, setTier] = useState<Tier | null>(null)
  const [compareState, setCompareState] = useState<ComparisonState | null>(null)
  const [history, setHistory] = useState<ComparisonState[]>([])
  const [round, setRound] = useState(1)
  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState<SavedInfo | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setStep('tier')
      setTier(null)
      setCompareState(null)
      setHistory([])
      setRound(1)
      setSaving(false)
      setSavedInfo(null)
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
        isManual: candidate.isManual,
        osmId: candidate.osmId,
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
      await onSaved()
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

  function handleChangeTier() {
    setTier(null)
    setCompareState(null)
    setHistory([])
    setSaveError(null)
    setStep('tier')
  }

  function handleClose() {
    onOpenChange(false)
  }

  if (!candidate) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {step === 'tier' && (
          <TierStep
            candidate={candidate}
            onPick={handleTierPick}
            onClose={handleClose}
            disabled={saving}
            error={saveError}
          />
        )}
        {step === 'compare' && tier && compareState && (
          <CompareStep
            candidate={candidate}
            tier={tier}
            existing={existingInTier}
            compareState={compareState}
            round={round}
            canUndo={history.length > 0}
            onChoice={handleChoice}
            onUndo={handleUndo}
            onChange={handleChangeTier}
            onClose={handleClose}
            disabled={saving}
            error={saveError}
          />
        )}
        {step === 'saved' && savedInfo && <SavedStep candidate={candidate} info={savedInfo} />}
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

const TIER_LABEL: Record<Tier, string> = {
  liked: 'Liked It',
  okay: 'It Was Okay',
  nope: "Didn't Like It",
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
  onClose,
  disabled,
  error,
}: {
  candidate: Candidate
  onPick: (tier: Tier) => void
  onClose: () => void
  disabled: boolean
  error: string | null
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <SheetTitle className="truncate text-lg">{candidate.name}</SheetTitle>
          {candidate.location && (
            <p className="truncate text-xs font-bold opacity-60">{candidate.location}</p>
          )}
        </div>
        <CloseButton onClose={onClose} />
      </div>
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
      <div className="mb-4 flex items-center justify-between gap-2">
        <SheetTitle className="text-lg">Which do you prefer?</SheetTitle>
        <CloseButton onClose={onClose} />
      </div>
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
          onClick={onChange}
          className="brutal-xs bg-card px-3 py-1.5 opacity-70 disabled:opacity-30"
        >
          Change tier
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
  const isNewTop = info.tier === 'liked' && info.rank === 1
  return (
    <div className="relative flex flex-col items-center py-6 text-center">
      {isNewTop && <Confetti />}
      <span
        className={`brutal-sm mb-3 flex h-12 w-12 items-center justify-center ${TIER_STYLE[info.tier]}`}
      >
        <TierIcon tier={info.tier} className="h-6 w-6" />
      </span>
      <SheetTitle className="mb-1">{isNewTop ? 'New #1! 🎉' : 'Saved!'}</SheetTitle>
      <SheetDescription>
        {candidate.name} · #{info.rank} in {TIER_LABEL[info.tier]} · Score {info.score.toFixed(1)}
      </SheetDescription>
    </div>
  )
}
