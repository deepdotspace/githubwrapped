/**
 * Source B: the public GitHub contributions fragment (tokenless).
 *
 *   GET https://github.com/users/<username>/contributions
 *
 * Returns HTML (200 for public users, 404 for unknown). Every hero stat in the
 * Wrapped story is derived from this fragment, so the parse is the load-bearing
 * piece of the whole data layer. We parse:
 *
 *   - day cells:  <td ... data-date="YYYY-MM-DD" id="contribution-day-component-W-D"
 *                     data-level="0..4" class="ContributionCalendar-day">
 *   - counts:     <tool-tip for="contribution-day-component-W-D">N contributions on ...</tool-tip>
 *                 (or "No contributions on ..." for zero)
 *
 * Counts are matched to cells by id (tooltip `for` -> cell `id`). Attributes are
 * read individually inside each tag, so GitHub reordering them does not break us.
 */

import type { WrappedDay, WrappedWeekday } from '../../lib/wrapped/types'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const WEEKDAY_ORDER: WrappedWeekday['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`))
  return m ? m[1] : null
}

function levelOf(n: number): WrappedDay['level'] {
  const v = n < 0 || n > 4 ? 0 : n
  return v as WrappedDay['level']
}

/**
 * Parse the fragment into a chronological `WrappedDay[]`. Pure: give it the HTML
 * string, get the calendar back. Days with no matching tooltip default to 0.
 */
export function parseContributions(html: string): WrappedDay[] {
  // 1) Every day cell -> { id, date, level }. We grab each <td ...> opening tag
  //    that carries the ContributionCalendar-day class, then read its attrs.
  const cellById = new Map<string, { date: string; level: WrappedDay['level'] }>()
  const cellRe = /<td\b[^>]*\bclass="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g
  let m: RegExpExecArray | null
  while ((m = cellRe.exec(html)) !== null) {
    const tag = m[0]
    const id = attr(tag, 'id')
    const date = attr(tag, 'data-date')
    if (!id || !date) continue
    const level = levelOf(parseInt(attr(tag, 'data-level') ?? '0', 10))
    cellById.set(id, { date, level })
  }

  // 2) Every tooltip -> count, matched back to a cell by `for`.
  const countById = new Map<string, number>()
  const tipRe = /<tool-tip\b[^>]*\bfor="(contribution-day-component-\d+-\d+)"[^>]*>([\s\S]*?)<\/tool-tip>/g
  while ((m = tipRe.exec(html)) !== null) {
    const id = m[1]
    const text = m[2].trim()
    const count = /^No contributions/i.test(text) ? 0 : parseInt(text.replace(/,/g, ''), 10) || 0
    countById.set(id, count)
  }

  const days: WrappedDay[] = []
  for (const [id, cell] of cellById) {
    days.push({ date: cell.date, count: countById.get(id) ?? 0, level: cell.level })
  }
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return days
}

export interface CalendarDerived {
  totalContributions: number
  longestStreak: number
  activeDays: number
  busiestDay: { label: string; date: string; count: number } | null
  busiestWeekday: WrappedWeekday['day']
  weekdayDistribution: WrappedWeekday[]
  brightestMonth: string
  weekendShare: number
}

function labelFor(date: string): string {
  const month = MONTHS[parseInt(date.slice(5, 7), 10) - 1]
  const day = parseInt(date.slice(8, 10), 10)
  return `${month} ${day}`
}

/** Derive every calendar-sourced stat from a parsed `WrappedDay[]`. Pure. */
export function deriveCalendarStats(days: WrappedDay[]): CalendarDerived {
  let total = 0
  let longest = 0
  let run = 0
  let active = 0
  let busiest: WrappedDay | null = null

  for (const d of days) {
    total += d.count
    if (d.count > 0) {
      active++
      run++
      if (run > longest) longest = run
    } else {
      run = 0
    }
    if (!busiest || d.count > busiest.count) busiest = d
  }

  // Weekday distribution (Mon..Sun) and month sums, grouped by the real dates.
  // Months are keyed by year-month, so the trailing-window's start month (which
  // spans two calendar years) is not folded into one bucket and double-counted.
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
  const monthSums = new Map<string, number>()
  for (const d of days) {
    const js = new Date(`${d.date}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat
    const idx = (js + 6) % 7 // 0=Mon..6=Sun
    weekdayCounts[idx] += d.count
    const ym = d.date.slice(0, 7)
    monthSums.set(ym, (monthSums.get(ym) ?? 0) + d.count)
  }

  const maxWeekday = Math.max(...weekdayCounts)
  const busiestWeekdayIdx = maxWeekday > 0 ? weekdayCounts.indexOf(maxWeekday) : 0
  const weekdayDistribution: WrappedWeekday[] = WEEKDAY_ORDER.map((day, i) => ({
    day,
    count: weekdayCounts[i],
    pct: maxWeekday > 0 ? Math.round((weekdayCounts[i] / maxWeekday) * 100) : 0,
  }))

  let brightestKey = days[0]?.date.slice(0, 7) ?? '0000-01'
  let brightestVal = -1
  for (const [ym, sum] of monthSums) {
    if (sum > brightestVal) {
      brightestVal = sum
      brightestKey = ym
    }
  }

  const weekendShare = total > 0 ? (weekdayCounts[5] + weekdayCounts[6]) / total : 0

  return {
    totalContributions: total,
    longestStreak: longest,
    activeDays: active,
    busiestDay:
      busiest && busiest.count > 0
        ? { label: labelFor(busiest.date), date: busiest.date, count: busiest.count }
        : null,
    busiestWeekday: WEEKDAY_ORDER[busiestWeekdayIdx],
    weekdayDistribution,
    brightestMonth: MONTHS[parseInt(brightestKey.slice(5, 7), 10) - 1],
    weekendShare,
  }
}

export interface ContributionsFetch {
  status: number
  html: string
}

// A browser-like UA: github.com throttles obvious-bot UAs from shared egress IPs
// (Cloudflare) much harder than browser traffic.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Fetch the contributions fragment with retry-on-429/5xx. github.com rate-limits
 * the shared Cloudflare egress IP on the unauthenticated fragment, so a single
 * attempt 429s a large fraction of the time. 200 and 404 are definitive and
 * returned immediately; 429/5xx/network errors back off and retry. `year`
 * optionally scopes the window via GitHub's ?from/&to params.
 */
export async function fetchContributions(
  username: string,
  year?: number,
): Promise<ContributionsFetch> {
  const base = `https://github.com/users/${encodeURIComponent(username)}/contributions`
  const url = year !== undefined ? `${base}?from=${year}-01-01&to=${year}-12-31` : base
  const ATTEMPTS = 5
  let lastStatus = 0
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
    } catch {
      lastStatus = 0
      if (attempt < ATTEMPTS - 1) await sleep(200 + attempt * 300)
      continue
    }
    lastStatus = res.status
    if (res.status === 200) return { status: 200, html: await res.text() }
    if (res.status === 404) return { status: 404, html: '' }
    // 429 / 5xx -> brief backoff, then retry (often a different egress sub-IP).
    if (attempt < ATTEMPTS - 1) await sleep(200 + attempt * 300)
  }
  return { status: lastStatus || 429, html: '' }
}
