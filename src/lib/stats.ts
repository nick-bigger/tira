import type { Tier } from '@/components/tier-icon'
import type { Bookmark } from './bookmarks'
import type { PlaceWithScore } from './places'

export interface HomeStats {
  triedCount: number
  favoritesCount: number
  wantToTryCount: number
  daysSinceLast: number | null
  topPick: PlaceWithScore | null
  streak: { count: number; days: number } | null
  recentlyAdded: PlaceWithScore[]
}

const TIER_ORDER: Tier[] = ['liked', 'okay', 'nope']
const DAY_MS = 86_400_000
/** Visits up to this many days apart still count as part of the same streak. */
const STREAK_GAP_DAYS = 4

function dateMs(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00`).getTime()
}

export function computeHomeStats(
  byTier: Record<Tier, PlaceWithScore[]>,
  bookmarks: Bookmark[],
): HomeStats {
  const all = TIER_ORDER.flatMap((t) => byTier[t])
  const visitedDates = all
    .map((p) => p.visitedDate)
    .filter((d): d is string => !!d)
    .sort()

  const daysSinceLast =
    visitedDates.length === 0
      ? null
      : Math.floor((Date.now() - dateMs(visitedDates[visitedDates.length - 1])) / DAY_MS)

  const recentlyAdded = [...all]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  return {
    triedCount: all.length,
    favoritesCount: byTier.liked.length,
    wantToTryCount: bookmarks.length,
    daysSinceLast,
    topPick: byTier.liked[0] ?? null,
    streak: computeStreak(visitedDates),
    recentlyAdded,
  }
}

/** Longest run of visits spaced no more than STREAK_GAP_DAYS apart - null unless there are
 *  at least two visits close enough together to call it an actual streak. */
function computeStreak(sortedDates: string[]): { count: number; days: number } | null {
  if (sortedDates.length < 2) return null

  let bestCount = 1
  let bestStart = 0
  let bestEnd = 0
  let runStart = 0

  for (let i = 1; i < sortedDates.length; i++) {
    const gapDays = Math.round((dateMs(sortedDates[i]) - dateMs(sortedDates[i - 1])) / DAY_MS)
    if (gapDays > STREAK_GAP_DAYS) runStart = i
    const runCount = i - runStart + 1
    if (runCount > bestCount) {
      bestCount = runCount
      bestStart = runStart
      bestEnd = i
    }
  }

  if (bestCount < 2) return null

  const days =
    Math.round((dateMs(sortedDates[bestEnd]) - dateMs(sortedDates[bestStart])) / DAY_MS) + 1
  return { count: bestCount, days }
}
