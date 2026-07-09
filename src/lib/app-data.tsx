import type { Candidate } from '@/components/add-place-overlay'
import type { Tier } from '@/components/tier-icon'
import { createContext, useContext } from 'react'
import type { Bookmark } from './bookmarks'
import type { PlaceWithScore } from './places'

export interface AppData {
  byTier: Record<Tier, PlaceWithScore[]>
  bookmarks: Bookmark[]
  /** Re-runs the shared root loader so every route sees fresh data. */
  refresh: () => Promise<void>
  /** Opens the add/search overlay - shared by the home search bar, the bottom nav's
   *  center button, and "Rank it" on a bookmark. */
  openAdd: (candidate?: Candidate) => void
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppShell')
  return ctx
}
