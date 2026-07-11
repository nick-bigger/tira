const DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const
type DayCode = (typeof DAY_ORDER)[number]
const DAY_INDEX: Record<DayCode, number> = Object.fromEntries(
  DAY_ORDER.map((d, i) => [d, i]),
) as Record<DayCode, number>

const DAY_LABEL: Record<DayCode, string> = {
  Mo: 'Mon',
  Tu: 'Tue',
  We: 'Wed',
  Th: 'Thu',
  Fr: 'Fri',
  Sa: 'Sat',
  Su: 'Sun',
}

export interface ParsedHours {
  /** undefined = no rule at all for that day (implicitly closed), null = explicitly "off",
   *  string = formatted time range(s). */
  byDay: Partial<Record<DayCode, string | null>>
}

function isDayCode(s: string): s is DayCode {
  return (DAY_ORDER as readonly string[]).includes(s)
}

function expandDays(part: string): DayCode[] | null {
  const days = new Set<DayCode>()
  for (const token of part.split(',').map((t) => t.trim())) {
    const range = /^([A-Za-z]{2})-([A-Za-z]{2})$/.exec(token)
    if (range) {
      const [, a, b] = range
      if (!isDayCode(a) || !isDayCode(b)) return null
      const end = DAY_INDEX[b]
      for (let i = DAY_INDEX[a], steps = 0; steps < 7; i = (i + 1) % 7, steps++) {
        days.add(DAY_ORDER[i])
        if (i === end) break
      }
    } else if (isDayCode(token)) {
      days.add(token)
    } else {
      return null
    }
  }
  return [...days]
}

function formatClock(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h24 = Number(hStr)
  const period = h24 >= 12 ? 'pm' : 'am'
  const h12 = h24 % 12 || 12
  return mStr === '00' ? `${h12}${period}` : `${h12}:${mStr}${period}`
}

function formatTimeRanges(timePart: string): string {
  return timePart
    .split(',')
    .map((range) => {
      const [start, end] = range.split('-')
      return `${formatClock(start)}–${formatClock(end)}`
    })
    .join(', ')
}

const RULE_RE =
  /^([A-Za-z,-]+)\s+(off|closed|\d{2}:\d{2}-\d{2}:\d{2}(?:,\d{2}:\d{2}-\d{2}:\d{2})*)$/i

/**
 * Best-effort parser for OSM's `opening_hours` mini-DSL, covering the common
 * "Mo-Fr 08:00-18:00; Sa 09:00-17:00; Su off" shape. Bails out (returns null) on anything it
 * isn't confident about - holiday rules, seasonal exceptions, comments - rather than risk
 * asserting a wrong "open"/"closed" for today. Callers fall back to showing the raw string.
 */
export function parseOpeningHours(raw: string): ParsedHours | null {
  const byDay: Partial<Record<DayCode, string | null>> = {}
  for (const rule of raw.split(';').map((r) => r.trim())) {
    if (!rule) continue
    const match = RULE_RE.exec(rule)
    if (!match) return null
    const [, daysPart, timePart] = match
    const days = expandDays(daysPart)
    if (!days) return null
    const value = /^(off|closed)$/i.test(timePart) ? null : formatTimeRanges(timePart)
    for (const day of days) byDay[day] = value
  }
  return { byDay }
}

function todayDayCode(): DayCode {
  // JS getDay() is 0=Sun..6=Sat; DAY_ORDER is Mo-first, so Sunday maps to index 6.
  return DAY_ORDER[(new Date().getDay() + 6) % 7]
}

/** "Today · 8am–10pm" / "Closed today" summary line for the collapsed hours row. */
export function todayHoursLabel(parsed: ParsedHours): string {
  const value = parsed.byDay[todayDayCode()]
  return value ? `Today · ${value}` : 'Closed today'
}

/** One line per weekday for the expanded hours row. */
export function weekHoursLines(parsed: ParsedHours): { label: string; hours: string }[] {
  return DAY_ORDER.map((day) => ({
    label: DAY_LABEL[day],
    hours: parsed.byDay[day] ?? 'Closed',
  }))
}
