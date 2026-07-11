import { PlaceDetailHeader } from '@/components/place-detail-header'
import { UnreviewedPlaceDetail } from '@/components/unreviewed-place-detail'
import { useAppData } from '@/lib/app-data'
import { deleteBookmark, updateBookmarkOsmEnrichment } from '@/lib/bookmarks'
import { useGoBack } from '@/lib/use-go-back'
import { useCachedOsmSync } from '@/lib/use-osm-enrichment'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/bookmark/$id')({
  component: BookmarkDetailPage,
})

function BookmarkDetailPage() {
  const { id } = Route.useParams()
  const { bookmarks, refresh, openReview } = useAppData()
  const router = useRouter()
  const goBack = useGoBack('/lists')
  const [removing, setRemoving] = useState(false)

  const bookmark = bookmarks.find((b) => b.id === id)

  useCachedOsmSync(
    { osmId: bookmark?.osmId ?? null, osmSyncedAt: bookmark?.osmSyncedAt ?? null },
    (details) => updateBookmarkOsmEnrichment(id, details).then(refresh),
  )

  if (!bookmark) {
    return (
      <div className="min-h-svh">
        <div className="flex items-center justify-center px-6 py-16">
          <div className="brutal bg-card p-8 text-center">
            <p className="mb-4 font-display text-xl font-bold">Couldn't find that bookmark.</p>
            <Link to="/lists" className="font-display text-sm font-bold opacity-70">
              ← Back to lists
            </Link>
          </div>
        </div>
      </div>
    )
  }

  function handleRank() {
    openReview({
      name: bookmark!.name,
      location: bookmark!.location ?? '',
      lat: bookmark!.lat ?? undefined,
      lng: bookmark!.lng ?? undefined,
      bookmarkId: bookmark!.id,
      isManual: false,
      osmId: bookmark!.osmId ?? undefined,
    })
  }

  async function handleRemove() {
    setRemoving(true)
    await deleteBookmark(bookmark!.id)
    await refresh()
    router.navigate({ to: '/lists' })
  }

  return (
    <div className="min-h-svh pb-12">
      <PlaceDetailHeader onBack={goBack} />
      <UnreviewedPlaceDetail
        place={bookmark}
        osmDetails={{
          cuisine: bookmark.cuisine,
          website: bookmark.website,
          phone: bookmark.phone,
          openingHours: bookmark.openingHours,
        }}
        bookmarked
        bookmarkPending={removing}
        onToggleBookmark={handleRemove}
        onReview={handleRank}
        reviewLabel="Rank It"
      />
    </div>
  )
}
