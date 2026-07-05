/**
 * WrappedStats — the day-0 shared contract.
 *
 * This is the single source of truth that flows from the Worker data layer
 * (src/server/wrapped/*) into BOTH the React story UI (src/components/wrapped/*)
 * and the Satori share card (src/server/og/*). Every value here traces back to
 * REAL GitHub data — there are no random/placeholder fields. Where a stat is not
 * sourceable for a given user, the field is null/empty and the UI shows the
 * designed low-data variant. Keep this file pure (no imports) so the Worker and
 * the browser can both import it.
 *
 * Section map (matches the prototype `GitHub Wrapped Experience.dc.html`):
 *   0 Cover · 1 Big Number · 2 Year in Squares · 3 Streak · 4 Feral Day
 *   5 Rhythm · 6 Languages · 7 Top Repo · 8 Receipts · 9 Personality · 10 Trophy
 */

/** One day in the contribution calendar. `level` is GitHub's 0..4 intensity. */
export interface WrappedDay {
  date: string // ISO YYYY-MM-DD
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

/** A language slice for the "Language as identity" section (top ~4). */
export interface WrappedLanguage {
  name: string
  pct: number // 0..100, rounded, summing to ~100 across the slice
  color: string // hex, GitHub's canonical language color where known
}

/** A weekday bar for the "Rhythm" section. `pct` is height relative to the busiest day (0..100). */
export interface WrappedWeekday {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  pct: number
  count: number
}

/** One braggable line in the "Receipts" section. Only sourceable stats appear. */
export interface WrappedReceipt {
  value: string // pre-formatted, e.g. "1,390 stars"
  sub: string // e.g. "earned. Strangers believe in you."
  color: string // accent hex
}

/** A stat tile on the final trophy/share card (4 of them). */
export interface WrappedCardStat {
  label: string // e.g. "LONGEST STREAK"
  value: string // e.g. "113 days"
}

/**
 * The developer-personality archetype. Deterministic, rule-based from the 4 axes.
 * `axes` are the resolved poles, e.g. ["Night Owl","Sprinter","Builder","Specialist"].
 */
export interface WrappedPersonality {
  name: string // UPPERCASE display name, e.g. "THE MIDNIGHT ARCHITECT"
  axes: [string, string, string, string]
  blurb: string // one or two sentences, em-dash-free
}

/** Resolved copy strings per section (filled server-side from the template bank). */
export interface WrappedCopy {
  coverSub: string // "Twelve months. Thousands of keystrokes. One story."
  bigNumberSub: string // "Your keyboard would like a word."
  squaresHeadline: string // may contain "\n", e.g. "March was your\nbrightest month."
  streakSub: string
  feralIntro: string // "On March 14 you made"
  feralSub: string // "in a single day. We hope everything is okay."
  rhythmHeadline: string // "Tuesday is your\npower day."
  rhythmSub: string
  languagesHeadline: string // "You spoke TypeScript\nfluently this year."
  languagesSub: string // "41% TypeScript, 27% Rust, 18% Python, and 14% pure chaos."
  topRepoIntro: string // "One repo had your whole heart this year."
  topRepoSub: string // "A second home."
  personalityKicker: string // "WE WATCHED HOW YOU CODE. WE KNOW WHAT YOU ARE."
}

/** The complete payload returned by GET /api/wrapped/:username. */
export interface WrappedStats {
  // identity
  username: string
  name: string
  avatarUrl: string | null
  year: number

  /** True when the year is sparse; the UI swaps to kinder low-data copy/visuals. */
  isQuietYear: boolean

  // 1 Big number
  totalContributions: number

  // 2 Year in squares — chronological, ~371 days (53 weeks x 7)
  calendar: WrappedDay[]
  brightestMonth: string // full month name, e.g. "March"

  // 3 Streak
  longestStreak: number

  // 4 Feral day — the single busiest day (null if no contributions)
  busiestDay: { label: string; date: string; count: number } | null

  // 5 Rhythm
  busiestWeekday: WrappedWeekday['day']
  weekdayDistribution: WrappedWeekday[] // length 7, Mon..Sun

  // 6 Languages
  topLanguage: string | null
  languages: WrappedLanguage[] // up to 4

  // 7 Top repo — the most-starred non-fork repo + its star count (null if none).
  topRepo: { fullName: string; stars: number } | null

  // 8 Receipts — up to 3 sourceable braggable stats
  receipts: WrappedReceipt[]

  // 9 Personality
  personality: WrappedPersonality

  // 10 Trophy card — 4 stat tiles
  cardStats: WrappedCardStat[]

  /** Resolved per-section copy (server-side template bank). */
  copy: WrappedCopy

  // meta
  generatedAt: string // ISO timestamp
  /** Where each headline stat came from, for transparency/debugging. Never shown faked. */
  sources?: Record<string, string>
}

/** Error envelope for the data endpoint (404 unknown user, etc.). */
export interface WrappedError {
  error: string
  code: 'NOT_FOUND' | 'RATE_LIMITED' | 'UPSTREAM' | 'BAD_INPUT'
}

export type WrappedResponse = WrappedStats | WrappedError

export function isWrappedError(r: WrappedResponse): r is WrappedError {
  return (r as WrappedError).error !== undefined
}
