import { AddPlaceOverlay } from '@/components/add-place-overlay'
import { ListIcon, MapViewIcon } from '@/components/icons'
import { PlaceListView } from '@/components/place-list-view'
import { PlaceMapView } from '@/components/place-map-view'
import type { Tier } from '@/components/tier-icon'
import { TiraMark } from '@/components/tira-mark'
import { Button } from '@/components/ui/button'
import { listPlacesByTier } from '@/lib/places'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

interface IndexSearch {
  add?: true
}

export const Route = createFileRoute('/')({
  component: RankedListPage,
  loader: () => listPlacesByTier(),
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    add: search.add === true || search.add === 'true' ? true : undefined,
  }),
})

const TIER_ORDER: Tier[] = ['liked', 'okay', 'nope']

type View = 'list' | 'map'

function RankedListPage() {
  const byTier = Route.useLoaderData()
  const { add } = Route.useSearch()
  const router = useRouter()
  const allPlaces = TIER_ORDER.flatMap((t) => byTier[t])
  const [view, setView] = useState<View>('list')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (add) setAddOpen(true)
  }, [add])

  function handleAddOpenChange(next: boolean) {
    setAddOpen(next)
    if (!next && add) {
      void router.navigate({ to: '/', search: {}, replace: true })
    }
  }

  async function handleSaved() {
    await router.invalidate()
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b-[3px] border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 font-display text-2xl font-bold">
            <TiraMark className="h-7 w-7" />
            Tira
          </span>
          <Button
            className="brutal-xs h-auto border-0 bg-primary px-4 py-2 font-display font-bold text-primary-foreground"
            onClick={() => setAddOpen(true)}
          >
            + Add place
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {allPlaces.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <>
            <div className="mb-6 inline-flex overflow-hidden rounded-md border-[2.5px] border-border shadow-[4px_4px_0px_var(--border)]">
              <button
                type="button"
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}
                className={`flex items-center gap-1.5 px-4 py-2 font-display text-sm font-bold ${
                  view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
                }`}
              >
                <ListIcon className="h-3.5 w-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setView('map')}
                aria-pressed={view === 'map'}
                className={`flex items-center gap-1.5 border-l-[2.5px] border-border px-4 py-2 font-display text-sm font-bold ${
                  view === 'map' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
                }`}
              >
                <MapViewIcon className="h-3.5 w-3.5" />
                Map
              </button>
            </div>

            {view === 'list' ? (
              <PlaceListView places={allPlaces} />
            ) : (
              <PlaceMapView places={allPlaces} />
            )}
          </>
        )}
      </main>

      <AddPlaceOverlay
        open={addOpen}
        onOpenChange={handleAddOpenChange}
        byTier={byTier}
        onSaved={handleSaved}
      />
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="brutal mx-auto mt-6 max-w-md bg-card p-8 text-center sm:mt-16 sm:p-10">
      <TiraMark className="mx-auto mb-3 h-10 w-10" />
      <p className="mb-2 font-display text-xl font-bold">No tiramisu yet.</p>
      <p className="mb-5 text-sm font-bold opacity-70">
        Add the first place you've tried to start the rankings.
      </p>
      <Button
        className="brutal-sm h-auto border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
        onClick={onAdd}
      >
        + Add place
      </Button>
    </div>
  )
}
