import { AddPlaceOverlay, type Candidate } from '@/components/add-place-overlay'
import { BOTTOM_NAV_CLEARANCE, BottomNav } from '@/components/bottom-nav'
import { ReviewSheet } from '@/components/review-sheet'
import type { Tier } from '@/components/tier-icon'
import { AppDataContext } from '@/lib/app-data'
import type { Bookmark } from '@/lib/bookmarks'
import type { PlaceWithScore } from '@/lib/places'
import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

/** Root-level shell rendered for every route: owns the shared byTier/bookmarks data, the
 *  persistent bottom nav, the single AddPlaceOverlay instance shared by the home search bar
 *  and the nav's center button, and the single ReviewSheet instance used to rank a new place
 *  from wherever it was picked. */
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
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewCandidate, setReviewCandidate] = useState<Candidate | null>(null)

  useEffect(() => {
    if (search.add === true || search.add === 'true') setAddOpen(true)
  }, [search.add])

  function handleAddOpenChange(next: boolean) {
    setAddOpen(next)
    if (!next && search.add) {
      void router.navigate({ to: '/', search: {}, replace: true })
    }
  }

  function openAdd() {
    setAddOpen(true)
  }

  function handleReviewOpenChange(next: boolean) {
    setReviewOpen(next)
    if (!next) {
      // Wait for the close transition to finish before clearing, so the sheet doesn't flash
      // back to the tier step while it's still animating out.
      setTimeout(() => setReviewCandidate(null), 250)
    }
  }

  function openReview(next: Candidate) {
    setReviewCandidate(next)
    setReviewOpen(true)
  }

  async function refresh() {
    await router.invalidate()
  }

  return (
    <AppDataContext.Provider value={{ byTier, bookmarks, refresh, openAdd, openReview }}>
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
        onReviewCandidate={openReview}
      />
      <ReviewSheet
        open={reviewOpen}
        onOpenChange={handleReviewOpenChange}
        candidate={reviewCandidate}
        byTier={byTier}
        onSaved={refresh}
      />
    </AppDataContext.Provider>
  )
}
