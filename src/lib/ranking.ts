import type { Tier } from '@/components/tier-icon'

export interface ComparisonState {
  lo: number
  hi: number
}

export function initComparison(existingCount: number): ComparisonState {
  return { lo: 0, hi: existingCount }
}

/** Index (within the existing tier list) to compare the new place against next, or null when done. */
export function compareIndex(state: ComparisonState): number | null {
  if (state.lo >= state.hi) return null
  return Math.floor((state.lo + state.hi) / 2)
}

export type ComparisonOutcome = 'new' | 'existing' | 'tie'

export function applyComparison(
  state: ComparisonState,
  outcome: ComparisonOutcome,
): ComparisonState {
  const mid = compareIndex(state)
  if (mid === null) return state
  if (outcome === 'new') return { lo: state.lo, hi: mid }
  if (outcome === 'existing') return { lo: mid + 1, hi: state.hi }
  // Tie / skip: too close to call, or not worth deciding right now - settle
  // immediately just after the compared item instead of narrowing further.
  return { lo: mid + 1, hi: mid + 1 }
}

export function insertionIndex(state: ComparisonState): number {
  return state.lo
}

export function estimatedRounds(existingCount: number): number {
  return existingCount === 0 ? 0 : Math.ceil(Math.log2(existingCount + 1))
}

export const TIER_BANDS: Record<Tier, [min: number, max: number]> = {
  liked: [6.7, 10],
  okay: [3.4, 6.6],
  nope: [0, 3.3],
}

/** Beli-style score: position within a tier maps onto that tier's score band. */
export function scoreFor(tier: Tier, position: number, tierCount: number): number {
  const [min, max] = TIER_BANDS[tier]
  if (tierCount <= 1) return max
  const fraction = position / (tierCount - 1)
  return Math.round((max - fraction * (max - min)) * 10) / 10
}
