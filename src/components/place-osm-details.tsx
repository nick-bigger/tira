import { parseOpeningHours, todayHoursLabel, weekHoursLines } from '@/lib/opening-hours'
import { ChevronDown, Globe, Phone } from 'lucide-react'

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

/** tel: URIs only tolerate digits, +, and a few separators - strip everything else. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function ContactBadges({
  website,
  phone,
}: {
  website: string | null
  phone: string | null
}) {
  if (!website && !phone) return null
  return (
    <div className="mt-3 flex gap-1.5">
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="brutal-xs flex flex-1 items-center justify-center gap-1.5 rounded-full bg-card py-1.5 text-[11px] font-bold text-foreground"
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          Website
        </a>
      )}
      {phone && (
        <a
          href={telHref(phone)}
          className="brutal-xs flex flex-1 items-center justify-center gap-1.5 rounded-full bg-card py-1.5 text-[11px] font-bold text-foreground"
        >
          <Phone className="h-3.5 w-3.5 shrink-0" />
          Call
        </a>
      )}
    </div>
  )
}

export function HoursDisclosure({ openingHours }: { openingHours: string | null }) {
  if (!openingHours) return null
  const parsed = parseOpeningHours(openingHours)

  return (
    <details className="group text-sm font-bold">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <span>🕐 {parsed ? todayHoursLabel(parsed) : 'Hours'}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 pl-6 text-[13px] leading-relaxed font-normal opacity-80">
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
