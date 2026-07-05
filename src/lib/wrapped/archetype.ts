/**
 * Developer-personality engine. Deterministic, rule-based, 16 archetypes from
 * four binary axes derived entirely from real GitHub signals (no randomness):
 *
 *   Time    : Weekend Warrior  vs  Weekday Grinder   (weekend share of activity)
 *   Cadence : Streaker         vs  Sprinter          (streak length + spikiness)
 *   Role    : Builder          vs  Maintainer        (repos shipped this year)
 *   Breadth : Generalist       vs  Specialist        (distinct primary languages)
 *
 * Honesty note: tokenless data gives us weekday rhythm, not hour-of-day, so the
 * Time axis reads "Weekend Warrior" / "Weekday Grinder" (sourceable) rather than
 * "Night Owl" / "Early Bird" (which would imply commit hours we cannot see).
 *
 * Pure module: imports only the shared type. Safe in the Worker and the browser.
 */

import type { WrappedPersonality } from './types'

/** Real, computed inputs to the engine. Every field traces to GitHub data. */
export interface PersonalitySignals {
  weekendShare: number // (Sat+Sun contributions) / total, 0..1
  longestStreak: number
  activeDays: number // days with count > 0
  calendarDays: number // length of the calendar window (~366)
  busiestDayCount: number
  totalContributions: number
  reposCreatedThisYear: number
  ownedNonForkRepos: number
  distinctPrimaryLanguages: number
  isQuietYear: boolean
}

type TimePole = 'Weekend Warrior' | 'Weekday Grinder'
type CadencePole = 'Streaker' | 'Sprinter'
type RolePole = 'Builder' | 'Maintainer'
type BreadthPole = 'Generalist' | 'Specialist'

interface Archetype {
  name: string
  blurb: string
}

/**
 * The full 16-archetype table, keyed `time|cadence|role|breadth`. Names are
 * memorable and uppercase; blurbs are celebratory, a little cheeky, flattering,
 * never mean, and contain no em dashes.
 */
const ARCHETYPES: Record<string, Archetype> = {
  'Weekday Grinder|Streaker|Builder|Specialist': {
    name: 'THE STEADY ARCHITECT',
    blurb:
      'You showed up on the clock, day after day, building one thing properly. Reliability is your love language.',
  },
  'Weekday Grinder|Streaker|Builder|Generalist': {
    name: 'THE RENAISSANCE ENGINEER',
    blurb:
      'Every weekday you built something new, in whatever language the problem demanded. A working week extremely well spent.',
  },
  'Weekday Grinder|Streaker|Maintainer|Specialist': {
    name: 'THE KEEPER OF THE FLAME',
    blurb:
      'You kept one codebase alive and humming every single weekday. Stewardship is an underrated art and you have it.',
  },
  'Weekday Grinder|Streaker|Maintainer|Generalist': {
    name: 'THE QUIET POLYMATH',
    blurb:
      'Steady weekday hands across many projects, keeping every plate spinning. Nothing dropped on your watch.',
  },
  'Weekday Grinder|Sprinter|Builder|Specialist': {
    name: 'THE DEADLINE SURGEON',
    blurb:
      'You build in focused bursts when it counts, deep in your home language. Cool under pressure, precise when it matters.',
  },
  'Weekday Grinder|Sprinter|Builder|Generalist': {
    name: 'THE STORM CHASER',
    blurb:
      'When inspiration struck you shipped fast and wide, language be damned. The calm days were just you reloading.',
  },
  'Weekday Grinder|Sprinter|Maintainer|Specialist': {
    name: 'THE FIREFIGHTER',
    blurb:
      'You appear when the codebase is on fire and leave once it is calm. One domain, total mastery, perfect timing.',
  },
  'Weekday Grinder|Sprinter|Maintainer|Generalist': {
    name: 'THE SWISS ARMY DEV',
    blurb:
      "Whatever broke, in whatever language, you fixed it in a burst and moved on. Your team's quiet secret weapon.",
  },
  'Weekend Warrior|Streaker|Builder|Specialist': {
    name: 'THE WEEKEND MONK',
    blurb:
      'While the world rested, you built, patiently and deeply, in your one true language. Devotion looks like this.',
  },
  'Weekend Warrior|Streaker|Builder|Generalist': {
    name: 'THE GARAGE INVENTOR',
    blurb:
      'Weekends were your workshop and you tried everything in it. Side projects are where the future gets prototyped.',
  },
  'Weekend Warrior|Streaker|Maintainer|Specialist': {
    name: 'THE LIGHTHOUSE KEEPER',
    blurb:
      'Every weekend you tended the same codebase so it never went dark. Quiet, faithful, completely essential.',
  },
  'Weekend Warrior|Streaker|Maintainer|Generalist': {
    name: 'THE SUNDAY GARDENER',
    blurb:
      'Weekend after weekend you tended a whole garden of projects. Everything you touched stayed alive and green.',
  },
  'Weekend Warrior|Sprinter|Builder|Specialist': {
    name: 'THE MIDNIGHT ARCHITECT',
    blurb:
      'You build on weekends, in bursts, and you go deep. Rest is a merge conflict you keep deferring.',
  },
  'Weekend Warrior|Sprinter|Builder|Generalist': {
    name: 'THE MAD SCIENTIST',
    blurb:
      'Weekends meant wild experiments in every language you could find. Half of them should not work. They do.',
  },
  'Weekend Warrior|Sprinter|Maintainer|Specialist': {
    name: 'THE PHANTOM COMMITTER',
    blurb:
      'You strike on weekends, fix the one thing nobody else understands, and vanish. Legends are made this way.',
  },
  'Weekend Warrior|Sprinter|Maintainer|Generalist': {
    name: 'THE CHAOS GREMLIN',
    blurb:
      'Weekend bursts across a dozen repos, leaving everything better and slightly bewildered. Beautiful, controlled chaos.',
  },
}

/** Low-data variant: sparse years do not give the axes enough to be honest. */
const QUIET_ARCHETYPE: Archetype = {
  name: 'THE QUIET BUILDER',
  blurb:
    'You built quietly this year, in small and deliberate bursts. No noise, no spectacle, just commits that count.',
}

function resolveTime(s: PersonalitySignals): TimePole {
  // Uniform activity would put 2/7 (~0.286) on the weekend. A meaningful lean
  // past ~0.33 earns the Weekend Warrior pole.
  return s.weekendShare > 0.33 ? 'Weekend Warrior' : 'Weekday Grinder'
}

function resolveCadence(s: PersonalitySignals): CadencePole {
  const meanActive = s.activeDays > 0 ? s.totalContributions / s.activeDays : 0
  const spikiness = meanActive > 0 ? s.busiestDayCount / meanActive : 0
  const activeRatio = s.calendarDays > 0 ? s.activeDays / s.calendarDays : 0
  // A long streak, or broad-and-even coverage without a dominant spike, reads
  // as a Streaker. A big peak over a thin baseline reads as a Sprinter.
  const isStreaker = s.longestStreak >= 21 || (activeRatio >= 0.5 && spikiness < 4)
  return isStreaker ? 'Streaker' : 'Sprinter'
}

function resolveRole(s: PersonalitySignals): RolePole {
  const isBuilder =
    s.reposCreatedThisYear >= 3 ||
    (s.ownedNonForkRepos >= 8 && s.reposCreatedThisYear >= 1)
  return isBuilder ? 'Builder' : 'Maintainer'
}

function resolveBreadth(s: PersonalitySignals): BreadthPole {
  return s.distinctPrimaryLanguages >= 3 ? 'Generalist' : 'Specialist'
}

/** Resolve the deterministic archetype for a developer from real signals. */
export function resolvePersonality(s: PersonalitySignals): WrappedPersonality {
  const time = resolveTime(s)
  const cadence = resolveCadence(s)
  const role = resolveRole(s)
  const breadth = resolveBreadth(s)
  const axes: WrappedPersonality['axes'] = [time, cadence, role, breadth]

  if (s.isQuietYear) {
    return { name: QUIET_ARCHETYPE.name, axes, blurb: QUIET_ARCHETYPE.blurb }
  }

  const key = `${time}|${cadence}|${role}|${breadth}`
  const a = ARCHETYPES[key] ?? QUIET_ARCHETYPE
  return { name: a.name, axes, blurb: a.blurb }
}

/** Exposed for tests / transparency: the complete 16-name table. */
export const ARCHETYPE_TABLE = ARCHETYPES
