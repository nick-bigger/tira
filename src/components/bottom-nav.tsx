import { HomeIcon, ListIcon, PlusIcon } from '@/components/icons'
import { Link, useRouterState } from '@tanstack/react-router'

const NAV_ITEM_CLASS =
  'flex w-20 flex-col items-center gap-1 font-display text-[0.65rem] font-bold no-underline'

/** Persistent bottom tab bar - Home, a center Search/add button, and Your Lists. Total
 *  footprint (row height + safe-area) is mirrored by AppShell's content padding and by any
 *  corner-pinned controls elsewhere so nothing sits underneath it. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isHome = pathname === '/'
  const isLists = pathname.startsWith('/lists')
  const isAdd = pathname.startsWith('/add')

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-border bg-background"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-xs items-center justify-around px-2">
        <Link
          to="/"
          className={`${NAV_ITEM_CLASS} ${isHome ? 'text-accent' : 'text-muted-foreground'}`}
        >
          <HomeIcon className="h-6 w-6" />
          Home
        </Link>

        <Link
          to="/add"
          aria-label="Search or add a place"
          className={`${NAV_ITEM_CLASS} ${isAdd ? 'text-accent' : 'text-muted-foreground'}`}
        >
          <span className="brutal-xs flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <PlusIcon className="h-4 w-4" />
          </span>
          Search
        </Link>

        <Link
          to="/lists"
          className={`${NAV_ITEM_CLASS} ${isLists ? 'text-accent' : 'text-muted-foreground'}`}
        >
          <ListIcon className="h-6 w-6" />
          Your Lists
        </Link>
      </div>
    </nav>
  )
}

/** Total visual height of BottomNav (row + safe-area) - reused so page content and any
 *  corner-pinned controls can clear it without duplicating this number in place. */
export const BOTTOM_NAV_CLEARANCE = 'calc(4.25rem + env(safe-area-inset-bottom))'
