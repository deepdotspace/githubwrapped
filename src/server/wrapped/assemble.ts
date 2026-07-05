/**
 * Pure assembly: already-fetched real GitHub inputs -> the WrappedStats contract.
 *
 * No I/O, no randomness, every number traced in `sources`. The GitHub raw types
 * are imported type-only, so this module never pulls the Worker runtime and can
 * be exercised offline against saved fixtures. The live orchestration lives in
 * `aggregate.ts`.
 */

import type {
  WrappedStats,
  WrappedReceipt,
  WrappedCardStat,
  WrappedDay,
} from '../../lib/wrapped/types'
import { resolvePersonality } from '../../lib/wrapped/archetype'
import type { PersonalitySignals } from '../../lib/wrapped/archetype'
import { resolveCopy } from '../../lib/wrapped/copy'
import { deriveCalendarStats } from './contributions'
import { aggregateLanguages } from './languages'
import type { RawGithubUser, RawGithubRepo } from './github'

const WEEKDAY_FULL: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
}

const RECEIPT_COLORS = ['#9bff5e', '#5be7ff', '#ffd84d']

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

function plural(n: number, one: string, many: string): string {
  return `${fmt(n)} ${n === 1 ? one : many}`
}

const USERNAME_RE = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username)
}

/** Most-starred non-fork owned repo, tie-broken by most-recent push. */
export function selectTopRepo(repos: RawGithubRepo[]): RawGithubRepo | null {
  const owned = repos.filter((r) => !r.fork)
  if (owned.length === 0) return null
  return [...owned].sort((a, b) => {
    if (b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count
    return a.pushed_at < b.pushed_at ? 1 : -1
  })[0]
}

export interface AssembleInput {
  username: string
  year: number
  calendar: WrappedDay[]
  profile: RawGithubUser | null
  repos: RawGithubRepo[]
  /** Byte maps for the bounded set of non-fork repos used for languages. */
  languageMaps: Record<string, number>[]
}

/** Build receipts from real profile/repo signals: take the top 3 that qualify. */
function buildReceipts(args: {
  totalStars: number
  totalForks: number
  followers: number
  reposThisYear: number
  distinctLanguages: number
  activeDays: number
}): WrappedReceipt[] {
  const candidates: Array<{ value: string; sub: string; ok: boolean }> = [
    {
      value: plural(args.totalStars, 'star', 'stars'),
      sub: 'earned. Strangers believe in you.',
      ok: args.totalStars >= 1,
    },
    {
      value: plural(args.followers, 'follower', 'followers'),
      sub: 'watching what you ship next.',
      ok: args.followers >= 10,
    },
    {
      value: plural(args.reposThisYear, 'repo', 'repos'),
      sub: 'started this year. Every one counts.',
      ok: args.reposThisYear >= 1,
    },
    {
      value: plural(args.totalForks, 'fork', 'forks'),
      sub: 'of your code, living in other hands.',
      ok: args.totalForks >= 1,
    },
    {
      value: plural(args.distinctLanguages, 'language', 'languages'),
      sub: 'spoken fluently. A real polyglot.',
      ok: args.distinctLanguages >= 2,
    },
    {
      value: plural(args.activeDays, 'day', 'days'),
      sub: 'you showed up. A year is a year.',
      ok: args.activeDays >= 1,
    },
  ]
  return candidates
    .filter((c) => c.ok)
    .slice(0, 3)
    .map((c, i) => ({ value: c.value, sub: c.sub, color: RECEIPT_COLORS[i % RECEIPT_COLORS.length] }))
}

/** Pure assembly: real inputs -> the WrappedStats contract. */
export function assembleWrappedStats(input: AssembleInput): WrappedStats {
  const { username, year, calendar, profile, repos, languageMaps } = input

  const derived = deriveCalendarStats(calendar)
  const isQuietYear = derived.totalContributions < 150 || derived.activeDays < 25

  const languages = aggregateLanguages(languageMaps)
  const topLanguage = languages[0]?.name ?? null

  const nonFork = repos.filter((r) => !r.fork)
  const totalStars = nonFork.reduce((s, r) => s + (r.stargazers_count || 0), 0)
  const totalForks = nonFork.reduce((s, r) => s + (r.forks_count || 0), 0)
  const reposThisYear = nonFork.filter((r) => r.created_at.startsWith(String(year))).length
  const distinctPrimaryLanguages = new Set(
    nonFork.map((r) => r.language).filter((l): l is string => !!l),
  ).size

  const top = selectTopRepo(repos)
  const topRepo = top ? { fullName: top.full_name, stars: top.stargazers_count } : null

  const signals: PersonalitySignals = {
    weekendShare: derived.weekendShare,
    longestStreak: derived.longestStreak,
    activeDays: derived.activeDays,
    calendarDays: calendar.length,
    busiestDayCount: derived.busiestDay?.count ?? 0,
    totalContributions: derived.totalContributions,
    reposCreatedThisYear: reposThisYear,
    ownedNonForkRepos: nonFork.length,
    distinctPrimaryLanguages,
    isQuietYear,
  }
  const personality = resolvePersonality(signals)

  const receipts = buildReceipts({
    totalStars,
    totalForks,
    followers: profile?.followers ?? 0,
    reposThisYear,
    distinctLanguages: distinctPrimaryLanguages,
    activeDays: derived.activeDays,
  })

  const cardStats: WrappedCardStat[] = [
    { label: 'CONTRIBUTIONS', value: fmt(derived.totalContributions) },
    {
      label: 'LONGEST STREAK',
      value: `${derived.longestStreak} ${derived.longestStreak === 1 ? 'day' : 'days'}`,
    },
    { label: 'TOP LANGUAGE', value: topLanguage ?? 'Mixed' },
    {
      label: 'BUSIEST DAY',
      // No contributions -> there is no real busiest weekday; don't fabricate one.
      value: derived.totalContributions > 0 ? WEEKDAY_FULL[derived.busiestWeekday] : 'Quiet year',
    },
  ]

  const copy = resolveCopy({
    username,
    isQuietYear,
    totalContributions: derived.totalContributions,
    brightestMonth: derived.brightestMonth,
    longestStreak: derived.longestStreak,
    busiestDay: derived.busiestDay,
    busiestWeekday: derived.busiestWeekday,
    topLanguage,
    languages,
    topRepo,
  })

  return {
    username,
    name: profile?.name || profile?.login || username,
    avatarUrl: profile?.avatar_url ?? null,
    year,
    isQuietYear,

    totalContributions: derived.totalContributions,

    calendar,
    brightestMonth: derived.brightestMonth,

    longestStreak: derived.longestStreak,

    busiestDay: derived.busiestDay,

    busiestWeekday: derived.busiestWeekday,
    weekdayDistribution: derived.weekdayDistribution,

    topLanguage,
    languages,

    topRepo,

    receipts,

    personality,

    cardStats,

    copy,

    generatedAt: new Date().toISOString(),
    sources: {
      totalContributions: 'github.com contributions graph (sum)',
      streak: 'github.com contributions graph (consecutive active days)',
      busiestDay: 'github.com contributions graph (max day)',
      rhythm: 'github.com contributions graph (grouped by weekday)',
      languages: 'github REST: repository languages, byte sum across recent non-fork repos',
      topRepo: 'github REST: most-starred non-fork repo + its star count',
      receipts: 'github REST: profile followers + non-fork repo stars/forks/count',
    },
  }
}
