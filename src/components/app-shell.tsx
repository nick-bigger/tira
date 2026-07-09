import { AddPlaceOverlay, type Candidate } from '@/components/add-place-overlay'
import { BOTTOM_NAV_CLEARANCE, BottomNav } from '@/components/bottom-nav'
import type { Tier } from '@/components/tier-icon'
import { AppDataContext } from '@/lib/app-data'
import type { Bookmark } from '@/lib/bookmarks'
import type { PlaceWithScore } from '@/lib/places'
import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

/** Root-level shell rendered for every route: owns the shared byTier/bookmarks data, the
 *  persistent bottom nav, and the single AddPlaceOverlay instance shared by the home search
 *  bar, the nav's center button, and "Rank it" on a bookmark. */
export function AppShell({
  byTier,
  bookmarks,
}: {
  byTier: Record<Tier, PlaceWithScore[]>
  bookmarks: Bookmark[]
}) {
  const router = useRouter()
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> })
  const [addOpen, setAddOpen] = useState(false)
  const [candidate, setCandidate] = useState<Candidate | null>(null)

  useEffect(() => {
    if (search.add === true || search.add === 'true') setAddOpen(true)
  }, [search.add])

  function handleAddOpenChange(next: boolean) {
    setAddOpen(next)
    if (!next) {
      setCandidate(null)
      if (search.add) void router.navigate({ to: '/', search: {}, replace: true })
    }
  }

  function openAdd(initial?: Candidate) {
    setCandidate(initial ?? null)
    setAddOpen(true)
  }

  async function refresh() {
    await router.invalidate()
  }

  return (
    <AppDataContext.Provider value={{ byTier, bookmarks, refresh, openAdd }}>
      <div style={{ paddingBottom: BOTTOM_NAV_CLEARANCE }}>
        <Outlet />
      </div>
      <BottomNav onSearchClick={() => openAdd()} />
      <AddPlaceOverlay
        open={addOpen}
        onOpenChange={handleAddOpenChange}
        byTier={byTier}
        bookmarks={bookmarks}
        onDataChanged={refresh}
        initialCandidate={candidate}
      />
    </AppDataContext.Provider>
  )
}
