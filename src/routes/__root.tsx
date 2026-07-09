import { AppShell } from '@/components/app-shell'
import { AuthGate } from '@/components/auth-gate'
import { HomeSkeleton, ListsSkeleton } from '@/components/loading-skeleton'
import { listBookmarks } from '@/lib/bookmarks'
import { listPlacesByTier } from '@/lib/places'
import { createRootRoute, useRouterState } from '@tanstack/react-router'

export const Route = createRootRoute({
  loader: async () => {
    const [byTier, bookmarks] = await Promise.all([listPlacesByTier(), listBookmarks()])
    return { byTier, bookmarks }
  },
  pendingComponent: RootPending,
  pendingMs: 150,
  component: RootComponent,
})

function RootPending() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return <AuthGate>{pathname.startsWith('/lists') ? <ListsSkeleton /> : <HomeSkeleton />}</AuthGate>
}

function RootComponent() {
  const { byTier, bookmarks } = Route.useLoaderData()
  return (
    <AuthGate>
      <AppShell byTier={byTier} bookmarks={bookmarks} />
    </AuthGate>
  )
}
