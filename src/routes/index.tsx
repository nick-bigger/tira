import { BookmarkIcon, ClockIcon, FlameIcon, HeartIcon, SearchIcon } from '@/components/icons'
import { TIER_LABEL, TierIcon } from '@/components/tier-icon'
import { TiraMark } from '@/components/tira-mark'
import { TiraMarkColor } from '@/components/tira-mark-color'
import { Button } from '@/components/ui/button'
import { useAppData } from '@/lib/app-data'
import { computeHomeStats } from '@/lib/stats'
import { createFileRoute, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import type { ReactNode } from 'react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const GREETING_NAMES = 'Nick & Natalie'

function HomePage() {
  const { byTier, bookmarks } = useAppData()
  const stats = computeHomeStats(byTier, bookmarks)
  const hasTried = stats.triedCount > 0

  return (
    <div className="mx-auto max-w-5xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 sm:px-6 sm:pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold">Hey {GREETING_NAMES} 👋</p>
          <p className="text-xs font-bold opacity-60">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 font-display text-xl font-bold text-accent">
          <TiraMarkColor className="h-8 w-8" />
          Tira
        </div>
      </div>

      <Link
        to="/add"
        className="brutal-xs mb-4 flex w-full items-center gap-2 bg-card px-3.5 py-3 text-left text-base font-bold text-muted-foreground no-underline md:text-sm"
      >
        <SearchIcon className="h-4 w-4 shrink-0 opacity-60" />
        Find a new tiramisu spot...
      </Link>

      <div className="brutal-xs mb-5 flex items-center gap-3 bg-accent px-4 py-3 text-accent-foreground">
        <div className="flex shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent-foreground bg-secondary font-display text-sm font-bold text-secondary-foreground">
            N
          </span>
          <span className="-ml-2.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent-foreground bg-secondary text-base">
            🌻
          </span>
        </div>
        <p className="text-sm font-bold">
          {hasTried ? (
            <>
              You two have tasted <b className="font-display">{stats.triedCount}</b> tiramisu
              {stats.triedCount === 1 ? '' : 's'} together 💕
            </>
          ) : (
            "You two haven't tasted any tiramisu yet - let's fix that 💕"
          )}
        </p>
      </div>

      {!hasTried ? (
        <EmptyHome />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatTile
              icon={<TiraMark className="h-4 w-4" />}
              tint="bg-[#fdeecf]"
              value={stats.triedCount}
              label="Tiramisus tried"
              linkSearch={{}}
            />
            <StatTile
              icon={<HeartIcon filled className="h-4 w-4 text-[#d97a9c]" />}
              tint="bg-[#fbe4ea]"
              value={stats.favoritesCount}
              label="Favorites"
              linkSearch={{}}
            />
            <StatTile
              icon={<BookmarkIcon className="h-4 w-4 text-tier-liked" />}
              tint="bg-[#e7f0e2]"
              value={stats.wantToTryCount}
              label="Want to try"
              linkSearch={{ mode: 'want-to-try' }}
            />
            <StatTile
              icon={<ClockIcon className="h-4 w-4" />}
              tint="bg-[#f1e6d5]"
              value={stats.daysSinceLast ?? '—'}
              label={stats.daysSinceLast === 1 ? 'Day since last bite' : 'Days since last bite'}
            />
          </div>

          {stats.topPick && (
            <Link
              to="/place/$id"
              params={{ id: stats.topPick.id }}
              className="brutal-xs mb-3 flex items-center justify-between gap-3 bg-[#fff2e0] px-4 py-3 text-foreground no-underline"
            >
              <div className="min-w-0">
                <p className="eyebrow text-[10px] text-accent">Current #1 pick</p>
                <p className="truncate font-display text-base font-bold">{stats.topPick.name}</p>
                {stats.topPick.location && (
                  <p className="truncate text-xs font-bold opacity-60">{stats.topPick.location}</p>
                )}
              </div>
              <span className="brutal-xs flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tier-liked font-display text-sm font-bold text-tier-liked-foreground">
                {stats.topPick.score.toFixed(1)}
              </span>
            </Link>
          )}

          {stats.streak && (
            <div className="brutal-xs mb-3 flex items-center gap-3 bg-secondary px-4 py-3 text-secondary-foreground">
              <FlameIcon className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-display text-sm font-bold">
                  Longest streak: {stats.streak.count} spots in {stats.streak.days} days
                </p>
                <p className="text-xs font-bold opacity-75">You two are on a roll 🔥</p>
              </div>
            </div>
          )}

          {stats.recentlyAdded.length > 0 && (
            <>
              <p className="mb-2 font-display text-sm font-bold">Recently added</p>
              <div className="flex flex-col gap-2">
                {stats.recentlyAdded.map((p) => (
                  <Link
                    key={p.id}
                    to="/place/$id"
                    params={{ id: p.id }}
                    className="brutal-xs flex items-center justify-between gap-2 bg-card px-3.5 py-2.5 text-foreground no-underline"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <TierIcon tier={p.tier} className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-sm font-bold">{p.name}</span>
                      <span className="shrink-0 text-xs font-bold opacity-50">
                        {TIER_LABEL[p.tier]}
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-sm font-bold text-tier-liked">
                      {p.score.toFixed(1)}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatTile({
  icon,
  tint,
  value,
  label,
  linkSearch,
}: {
  icon: ReactNode
  tint: string
  value: number | string
  label: string
  /** Present -> the tile links to /lists (empty = Been tab, { mode: 'want-to-try' } for that tab). */
  linkSearch?: { mode?: 'want-to-try' }
}) {
  const content = (
    <>
      <span
        className={`mb-1 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border ${tint}`}
      >
        {icon}
      </span>
      <span className="font-display text-3xl leading-none font-bold">{value}</span>
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
    </>
  )

  if (!linkSearch) {
    return <div className="brutal-xs flex flex-col gap-1 bg-card p-3.5">{content}</div>
  }

  return (
    <Link
      to="/lists"
      search={linkSearch}
      className="brutal-xs flex flex-col gap-1 bg-card p-3.5 text-foreground no-underline"
    >
      {content}
    </Link>
  )
}

function EmptyHome() {
  return (
    <div className="brutal mx-auto mt-4 max-w-md bg-card p-8 text-center">
      <TiraMark className="mx-auto mb-3 h-10 w-10" />
      <p className="mb-2 font-display text-xl font-bold">No tiramisu yet.</p>
      <p className="mb-5 text-sm font-bold opacity-70">
        Add the first place you've tried together to start your rankings.
      </p>
      <Button
        asChild
        className="brutal-sm h-auto border-0 bg-primary py-2.5 font-display font-bold text-primary-foreground"
      >
        <Link to="/add" className="no-underline">
          + Add place
        </Link>
      </Button>
    </div>
  )
}
