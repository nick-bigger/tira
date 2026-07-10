import type { Candidate } from '@/components/add-place-page'
import { BOTTOM_NAV_CLEARANCE, BottomNav } from '@/components/bottom-nav'
import { ReviewSheet } from '@/components/review-sheet'
import type { Tier } from '@/components/tier-icon'
import { AppDataContext } from '@/lib/app-data'
import type { Bookmark } from '@/lib/bookmarks'
import type { PlaceWithScore } from '@/lib/places'
import { Outlet, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

/** Root-level shell rendered for every route: owns the shared byTier/bookmarks data, the
 *  persistent bottom nav (visible on every page, including /add), and the single ReviewSheet
 *  instance used to rank a new place from wherever it was picked. */
export function AppShell({
  byTier,
  bookmarks,
}: {
  byTier: Record<Tier, PlaceWithScore[]>
  bookmarks: Bookmark[]
}) {
  const router = useRouter()
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewCandidate, setReviewCandidate] = useState<Candidate | null>(null)

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
    <AppDataContext.Provider value={{ byTier, bookmarks, refresh, openReview }}>
      <div style={{ paddingBottom: BOTTOM_NAV_CLEARANCE }}>
        <Outlet />
      </div>
      <BottomNav />
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
