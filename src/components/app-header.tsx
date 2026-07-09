import { TiraMark } from '@/components/tira-mark'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/** Sticky top bar shown on every page - Tira wordmark (always links home) on the left,
 *  page-specific actions on the right, with an optional row of extra content below (tabs,
 *  a back button, etc). */
export function AppHeader({ actions, children }: { actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b-[3px] border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-2xl font-bold no-underline"
        >
          <TiraMark className="h-7 w-7" />
          Tira
        </Link>
        {actions}
      </div>
      {children}
    </header>
  )
}
