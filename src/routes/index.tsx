import { PinIcon } from '@/components/pin-icon'
import { TIER_LABEL, TierIcon, type Tier } from '@/components/tier-icon'
import { TiraMark } from '@/components/tira-mark'
import { Button } from '@/components/ui/button'
import { listPlacesByTier, type PlaceWithScore } from '@/lib/places'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RankedListPage,
  loader: () => listPlacesByTier(),
})

const TIER_ORDER: Tier[] = ['liked', 'okay', 'nope']

const TIER_BG: Record<Tier, string> = {
  liked: 'bg-tier-liked text-tier-liked-foreground',
  okay: 'bg-tier-okay text-tier-okay-foreground',
  nope: 'bg-tier-nope text-tier-nope-foreground',
}

function RankedListPage() {
  const byTier = Route.useLoaderData()
  const allPlaces = TIER_ORDER.flatMap((t) => byTier[t])
  const topPick = byTier.liked[0] ?? byTier.okay[0] ?? byTier.nope[0]

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b-[3px] border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 font-display text-2xl font-bold">
            <TiraMark className="h-7 w-7" />
            Tira
          </span>
          <Button
            asChild
            className="brutal-xs h-auto border-0 bg-primary px-4 py-2 font-display font-bold text-primary-foreground"
          >
            <Link to="/add">+ Add place</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {allPlaces.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="brutal-sm mb-6 flex max-w-sm overflow-hidden bg-secondary sm:mb-10">
              <div className="flex-1 border-r-[2.5px] border-border px-4 py-3">
                <div className="eyebrow text-[10px]">Tried</div>
                <div className="font-display text-lg font-bold">{allPlaces.length}</div>
              </div>
              <div className="min-w-0 flex-1 px-4 py-3">
                <div className="eyebrow text-[10px]">Top pick</div>
                <div className="truncate font-display text-sm font-bold">
                  {topPick?.name ?? '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
              {TIER_ORDER.map((tier) => (
                <TierSection key={tier} tier={tier} places={byTier[tier]} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function TierSection({ tier, places }: { tier: Tier; places: PlaceWithScore[] }) {
  return (
    <section>
      <span
        className={`eyebrow brutal-xs mb-3 inline-flex items-center gap-1.5 px-3 py-1 ${TIER_BG[tier]}`}
      >
        <TierIcon tier={tier} className="h-3 w-3" />
        {TIER_LABEL[tier]}
      </span>
      {places.length === 0 ? (
        <p className="px-1 text-sm font-bold opacity-60">None yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {places.map((p) => (
            <Link
              key={p.id}
              to="/place/$id"
              params={{ id: p.id }}
              className="brutal-sm flex flex-row items-center gap-3 bg-card p-3 text-foreground no-underline"
            >
              <span className="w-5 shrink-0 font-display text-lg font-bold">{p.rankInTier}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{p.name}</p>
                {p.location && (
                  <p className="flex items-center gap-1 truncate text-xs font-bold opacity-60">
                    <PinIcon className="h-3 w-3 shrink-0" />
                    {p.location}
                  </p>
                )}
              </div>
              <span className={`eyebrow brutal-xs shrink-0 px-2 py-1 ${TIER_BG[tier]}`}>
                {p.score.toFixed(1)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyState() {
  return (
    <div className="brutal mx-auto mt-6 max-w-md bg-card p-8 text-center sm:mt-16 sm:p-10">
      <TiraMark className="mx-auto mb-3 h-10 w-10" />
      <p className="mb-2 font-display text-xl font-bold">No tiramisu yet.</p>
      <p className="mb-5 text-sm font-bold opacity-70">
        Add the first place you've tried to start the rankings.
      </p>
      <Button
        asChild
        className="brutal-sm h-auto border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
      >
        <Link to="/add">+ Add place</Link>
      </Button>
    </div>
  )
}
