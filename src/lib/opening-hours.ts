const DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const
type DayCode = (typeof DAY_ORDER)[number]
const DAY_INDEX: Record<DayCode, number> = Object.fromEntries(
  DAY_ORDER.map((d, i) => [d, i]),
) as Record<DayCode, number>

const DAY_LABEL: Record<DayCode, string> = {
  Mo: 'Monday',
  Tu: 'Tuesday',
  We: 'Wednesday',
  Th: 'Thursday',
  Fr: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
}

interface TimeRange {
  start: string
  end: string
}

export interface ParsedHours {
  /** undefined = no rule at all for that day (implicitly closed), null = explicitly "off",
   *  array = one or more open time ranges that day. */
  byDay: Partial<Record<DayCode, TimeRange[] | null>>
}

function isDayCode(s: string): s is DayCode {
  return (DAY_ORDER as readonly string[]).includes(s)
}

function todayIndex(): number {
  // JS getDay() is 0=Sun..6=Sat; DAY_ORDER is Mo-first, so Sunday maps to index 6.
  return (new Date().getDay() + 6) % 7
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
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  return mStr === '00' ? `${h12} ${period}` : `${h12}:${mStr} ${period}`
}

function formatRange(range: TimeRange): string {
  return `${formatClock(range.start)} - ${formatClock(range.end)}`
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function parseTimeRanges(timePart: string): TimeRange[] {
  return timePart.split(',').map((range) => {
    const [start, end] = range.split('-')
    return { start, end }
  })
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
  const byDay: Partial<Record<DayCode, TimeRange[] | null>> = {}
  for (const rule of raw.split(';').map((r) => r.trim())) {
    if (!rule) continue
    const match = RULE_RE.exec(rule)
    if (!match) return null
    const [, daysPart, timePart] = match
    const days = expandDays(daysPart)
    if (!days) return null
    const value = /^(off|closed)$/i.test(timePart) ? null : parseTimeRanges(timePart)
    for (const day of days) byDay[day] = value
  }
  return { byDay }
}

export interface OpenStatus {
  open: boolean
  /** "Closes 11 PM" / "Opens 11 AM Monday" - no "Open"/"Closed" prefix, callers style that. */
  label: string
}

/** Whether the place is open right now, and when it closes/next opens - mirrors the "Open ·
 *  Closes 11 PM" / "Closed · Opens 11 AM" status line other place-detail apps show. Ranges that
 *  cross midnight (e.g. "18:00-02:00") are treated as ending the next day. */
export function currentStatus(parsed: ParsedHours): OpenStatus {
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const todayIdx = todayIndex()

  const todayRanges = parsed.byDay[DAY_ORDER[todayIdx]]
  for (const range of todayRanges ?? []) {
    const start = toMinutes(range.start)
    const end = toMinutes(range.end)
    const spansMidnight = end <= start
    if (spansMidnight ? nowMin >= start : nowMin >= start && nowMin < end) {
      return { open: true, label: `Closes ${formatClock(range.end)}` }
    }
  }
  const yesterdayRanges = parsed.byDay[DAY_ORDER[(todayIdx + 6) % 7]]
  for (const range of yesterdayRanges ?? []) {
    const start = toMinutes(range.start)
    const end = toMinutes(range.end)
    if (end <= start && nowMin < end) {
      return { open: true, label: `Closes ${formatClock(range.end)}` }
    }
  }

  for (let offset = 0; offset < 7; offset++) {
    const idx = (todayIdx + offset) % 7
    const ranges = parsed.byDay[DAY_ORDER[idx]]
    for (const range of ranges ?? []) {
      if (offset === 0 && toMinutes(range.start) <= nowMin) continue
      const day = offset === 0 ? '' : ` ${DAY_LABEL[DAY_ORDER[idx]]}`
      return { open: false, label: `Opens ${formatClock(range.start)}${day}` }
    }
  }
  return { open: false, label: 'Closed this week' }
}

/** One line per weekday for the expanded hours row, starting from today (matching how most
 *  place-detail apps order the week) rather than always Monday-first. */
export function weekHoursLines(parsed: ParsedHours): { label: string; hours: string }[] {
  const todayIdx = todayIndex()
  return Array.from({ length: 7 }, (_, offset) => {
    const day = DAY_ORDER[(todayIdx + offset) % 7]
    const ranges = parsed.byDay[day]
    return {
      label: DAY_LABEL[day],
      hours: ranges && ranges.length > 0 ? ranges.map(formatRange).join(', ') : 'Closed',
    }
  })
}
