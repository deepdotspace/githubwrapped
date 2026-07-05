/**
 * Per-section copy bank. Resolves the `WrappedCopy` strings from real, already
 * computed stats. Deterministic (no live AI): each line is chosen from a bank of
 * hand-authored, voiced variants by a stable per-username seed, so different
 * developers read differently while the same developer always reads the same.
 * Banks are bucketed by real data (quiet vs busy, streak/feral tiers, weekend vs
 * midweek, language), so the narrative also fits what the person actually did.
 *
 * Voice: celebratory, a little cheeky, flattering, never mean. No em dashes.
 *
 * Pure module: imports only the shared type. Safe in the Worker and the browser.
 */

import type { WrappedCopy, WrappedLanguage, WrappedWeekday } from './types'

/** The fields this bank needs. A structural subset of the assembled stats. */
export interface CopyInput {
  username: string
  isQuietYear: boolean
  totalContributions: number
  brightestMonth: string
  longestStreak: number
  busiestDay: { label: string; date: string; count: number } | null
  busiestWeekday: WrappedWeekday['day']
  topLanguage: string | null
  languages: WrappedLanguage[]
  topRepo: { fullName: string; stars: number } | null
}

const WEEKDAY_FULL: Record<WrappedWeekday['day'], string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
}

/** Stable, non-random seed from the username so variant choice is deterministic. */
function seedOf(username: string): number {
  let h = 0
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0
  return h
}

function pick<T>(variants: T[], seed: number, salt: number): T {
  return variants[(seed + salt) % variants.length]
}

/** Build the languages sentence honestly from the real slices. */
function languagesSub(langs: WrappedLanguage[]): string {
  if (langs.length === 0) return 'Your languages stayed a mystery this year.'
  if (langs.length === 1) return `${langs[0].pct}% ${langs[0].name}, and nothing else got a look in.`
  const parts = langs.map((l) => `${l.pct}% ${l.name}`)
  const last = parts.pop() as string
  return `${parts.join(', ')}, and ${last}.`
}

export function resolveCopy(s: CopyInput): WrappedCopy {
  const seed = seedOf(s.username)
  const quiet = s.isQuietYear
  const weekdayFull = WEEKDAY_FULL[s.busiestWeekday]

  // 1 Cover
  const coverSub = quiet
    ? pick(
        [
          'A quiet year is still a year. Here is what you built.',
          'Not every year is loud. This one was yours all the same.',
          'A gentler year, told back to you, square by square.',
        ],
        seed,
        20,
      )
    : pick(
        [
          'Twelve months. Thousands of keystrokes. One story.',
          'A whole year of your code, told back to you.',
          'Everything you shipped this year, in one scroll.',
          'One year. Counted, sorted, and gently judged.',
          'Your commits had a year. Here is the recap.',
          'Pour one out for your keyboard. This is its year too.',
          'A year of green squares, set to motion.',
          'The numbers are in. Let us take a walk through them.',
        ],
        seed,
        1,
      )

  // 2 Big number
  const bigNumberSub = quiet
    ? pick(
        ['Every single one of them counts.', 'Small number, real work.', 'Quality over quantity. We see you.'],
        seed,
        21,
      )
    : s.totalContributions >= 5000
      ? pick(
          [
            'Touch grass. We are begging you.',
            'This stopped being a hobby a long time ago.',
            'Did you code in your sleep? Be honest.',
            'The keyboard has filed for hazard pay.',
          ],
          seed,
          22,
        )
      : s.totalContributions >= 3000
        ? pick(
            [
              'Your keyboard would like a word.',
              'That is not a year, that is a sentence served.',
              'The commits begged for mercy. You did not listen.',
              'Somewhere, a linter is lying down.',
              'A frankly alarming amount of green.',
            ],
            seed,
            2,
          )
        : s.totalContributions >= 1000
          ? pick(
              [
                'That is a lot of green squares.',
                'You kept the grass very, very green.',
                'A respectable mountain of work.',
                'The contribution graph glowed for you.',
                'You showed up, and it shows.',
              ],
              seed,
              3,
            )
          : pick(
              [
                'A solid year at the keyboard.',
                'Quiet hands, real work.',
                'Steady is its own kind of fast.',
                'Every commit was a choice. You chose well.',
              ],
              seed,
              4,
            )

  // 3 Year in squares
  const squaresHeadline = pick(
    [
      `${s.brightestMonth} was your\nbrightest month.`,
      `You peaked\nin ${s.brightestMonth}.`,
      `${s.brightestMonth} did the\nheavy lifting.`,
      `Your year glowed\nbrightest in ${s.brightestMonth}.`,
    ],
    seed,
    13,
  )

  // 4 Streak
  const streakSub = quiet
    ? pick(
        ['You showed up. That is the whole game.', 'Presence beats streaks. You had presence.', 'Showing up was the win.'],
        seed,
        23,
      )
    : s.longestStreak >= 100
      ? pick(
          [
            'Triple digits without a miss. Are you alright?',
            'You out-streaked entire calendars.',
            'One hundred days and the grid never went grey.',
          ],
          seed,
          24,
        )
      : s.longestStreak >= 30
        ? pick(
            [
              'You showed up when no one was watching.',
              'Day after day after day. Discipline, rendered in green.',
              'The chain never broke. Neither did you.',
              'You and the green grid had an understanding.',
            ],
            seed,
            5,
          )
        : pick(
            [
              'You kept the chain going longer than most.',
              'Consistency is its own kind of talent.',
              'A streak is a promise you kept.',
              'Longer than most people manage.',
            ],
            seed,
            6,
          )

  // 5 Feral day
  const feralIntro = s.busiestDay ? `On ${s.busiestDay.label} you made` : 'Your busiest day was a blur'
  const feralCount = s.busiestDay?.count ?? 0
  const feralSub = !s.busiestDay
    ? pick(['a respectable dent in the backlog.', 'a steady, even effort all year.'], seed, 25)
    : feralCount >= 100
      ? pick(
          [
            'in one day. We are formally concerned.',
            'in a single day. The keyboard requested a lawyer.',
            'in one sitting. We hope you were sitting down.',
          ],
          seed,
          26,
        )
      : feralCount >= 50
        ? pick(
            [
              'in a single day. We hope everything is okay.',
              'in one day. Someone please check on this person.',
              'in a day. Did the deadline survive?',
              'in one go, presumably. Iconic.',
            ],
            seed,
            7,
          )
        : feralCount >= 15
          ? pick(
              [
                'in a single day. A personal best to be proud of.',
                'in one day. That is a real spike.',
                'in a single day. You felt something that day.',
              ],
              seed,
              27,
            )
          : pick(
              ['in a single day. Your one big push of the year.', 'in a single day. The day you meant it.'],
              seed,
              28,
            )

  // 6 Rhythm
  const rhythmHeadline = `${weekdayFull} is your\npower day.`
  const isWeekend = s.busiestWeekday === 'Sat' || s.busiestWeekday === 'Sun'
  const rhythmSub = quiet
    ? pick(['Whenever you showed up, you meant it.', 'You picked your moments and made them count.'], seed, 29)
    : isWeekend
      ? pick(
          [
            'While the world logged off, you logged in.',
            'Weekends are where your best work hides.',
            'Saturdays were sacred. To shipping.',
            'The weekend warrior is real, and it is you.',
          ],
          seed,
          8,
        )
      : pick(
          [
            'Mid-week is when you hit your stride.',
            'You found your gear and stayed in it.',
            'You found your day and made it yours.',
            'Right in the middle of the week, you peaked.',
          ],
          seed,
          9,
        )

  // 7 Languages
  const languagesHeadline = s.topLanguage
    ? quiet
      ? `You spoke ${s.topLanguage}\nthis year.`
      : pick(
          [
            `You spoke ${s.topLanguage}\nfluently this year.`,
            `You and ${s.topLanguage}\nwere inseparable.`,
            `${s.topLanguage} was your\nlove language.`,
            `Mostly ${s.topLanguage},\ngloriously so.`,
          ],
          seed,
          14,
        )
    : 'Your stack stayed\nbeautifully mysterious.'

  // 8 Top repo — framed honestly as the flagship/most-starred repo. Selection is
  // by stars, not by this-year activity, so the copy must not claim time-spent.
  const topRepoIntro = s.topRepo
    ? pick(
        [
          'Your flagship repo.',
          'The one that carries your name.',
          'Your signature project.',
          'The repo people know you for.',
          'Your headline project.',
          'The one that stuck.',
        ],
        seed,
        10,
      )
    : 'Your work was spread across everything you touched.'
  const topRepoSub = s.topRepo
    ? pick(
        [
          'Your calling card.',
          'The one people remember.',
          'Your greatest hit.',
          'This is the one.',
          'The cornerstone of your profile.',
          'The center of it all.',
        ],
        seed,
        11,
      )
    : 'No single favorite. You spread the love around.'

  // 10 Personality kicker
  const personalityKicker = pick(
    [
      'WE WATCHED HOW YOU CODE. WE KNOW WHAT YOU ARE.',
      'WE READ THE COMMITS. HERE IS THE VERDICT.',
      'WE STUDIED EVERY PUSH. THE VERDICT IS IN.',
      'THE DATA LOOKED BACK AT YOU. HERE IS WHAT IT SAW.',
      'WE DID THE MATH ON YOU. BRACE YOURSELF.',
    ],
    seed,
    12,
  )

  return {
    coverSub,
    bigNumberSub,
    squaresHeadline,
    streakSub,
    feralIntro,
    feralSub,
    rhythmHeadline,
    rhythmSub,
    languagesHeadline,
    languagesSub: languagesSub(s.languages),
    topRepoIntro,
    topRepoSub,
    personalityKicker,
  }
}
