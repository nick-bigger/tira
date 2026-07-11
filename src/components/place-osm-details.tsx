import { ClockIcon } from '@/components/icons'
import { currentStatus, parseOpeningHours, weekHoursLines } from '@/lib/opening-hours'
import { ChevronDown, Globe, Phone } from 'lucide-react'
import { useState } from 'react'

/** "coffee_shop;pastry" -> "Coffee Shop, Pastry" */
function formatCuisine(cuisine: string): string {
  return cuisine
    .split(/[;,]/)
    .map((s) => s.trim().replace(/_/g, ' '))
    .filter(Boolean)
    .map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(', ')
}

export function CuisineText({ cuisine }: { cuisine: string | null }) {
  if (!cuisine) return null
  return <p className="mt-0.5 text-sm font-bold opacity-70">{formatCuisine(cuisine)}</p>
}

export function CuisineSkeleton() {
  return <div className="skeleton mt-1.5 h-3.5 w-28" />
}

/** tel: URIs only tolerate digits, +, and a few separators - strip everything else. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/** Shared min-content (not stretched) pill styling for the Website/Call/Directions badge row -
 *  exported so directions-button.tsx's Directions badge matches exactly. */
export const BADGE_CLASS =
  'brutal-xs inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[11px] font-bold text-foreground'

/** Website/Call badges only - no wrapping row, since callers place these alongside
 *  DirectionsButton (always present, not OSM-derived) in one shared badge row. */
export function ContactBadges({
  website,
  phone,
}: {
  website: string | null
  phone: string | null
}) {
  return (
    <>
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer" className={BADGE_CLASS}>
          <Globe className="h-3.5 w-3.5 shrink-0" />
          Website
        </a>
      )}
      {phone && (
        <a href={telHref(phone)} className={BADGE_CLASS}>
          <Phone className="h-3.5 w-3.5 shrink-0" />
          Call
        </a>
      )}
    </>
  )
}

/** Stand-in for ContactBadges while the initial OSM sync is still in flight - we don't yet know
 *  whether it'll resolve to 0, 1, or 2 badges, so show one placeholder pill next to Directions. */
export function ContactBadgesSkeleton() {
  return <div className="skeleton h-[30px] w-24 shrink-0 rounded-full" />
}

export function HoursDisclosure({ openingHours }: { openingHours: string | null }) {
  const [expanded, setExpanded] = useState(false)
  if (!openingHours) return null
  const parsed = parseOpeningHours(openingHours)
  const status = parsed ? currentStatus(parsed) : null

  return (
    <details
      className="group text-sm font-bold"
      open={expanded}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span className="brutal-xs flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
          <ClockIcon className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="eyebrow text-[10px] opacity-60">Hours</p>
          <p>
            {status ? (
              <span className={status.open ? 'text-tier-liked' : 'opacity-70'}>
                {expanded ? (
                  status.open ? (
                    'Open now'
                  ) : (
                    'Closed now'
                  )
                ) : (
                  <>
                    {status.open ? 'Open' : 'Closed'}{' '}
                    <span className="font-normal opacity-70">&bull; {status.label}</span>
                  </>
                )}
              </span>
            ) : (
              'See hours'
            )}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 pl-11 text-[13px] leading-relaxed font-normal opacity-80">
        {parsed
          ? weekHoursLines(parsed).map(({ label, hours }) => (
              <div key={label} className="flex justify-between gap-4">
                <span>{label}</span>
                <span>{hours}</span>
              </div>
            ))
          : openingHours}
      </div>
    </details>
  )
}

export function HoursSkeleton() {
  return <div className="skeleton h-[18px] w-40" />
}
