import type { Candidate } from '@/components/add-place-page'
import type { Tier } from '@/components/tier-icon'
import { createContext, useContext } from 'react'
import type { Bookmark } from './bookmarks'
import type { PlaceWithScore } from './places'

export interface AppData {
  byTier: Record<Tier, PlaceWithScore[]>
  bookmarks: Bookmark[]
  /** Re-runs the shared root loader so every route sees fresh data. */
  refresh: () => Promise<void>
  /** Opens the tier/compare review flow for a candidate as its own overlay, on top of
   *  whatever page triggered it - used by "Rank It" on a bookmark (its list row and its
   *  detail page) and by the /add page once a place is picked. */
  openReview: (candidate: Candidate) => void
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppShell')
  return ctx
}
