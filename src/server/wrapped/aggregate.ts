/**
 * The live Wrapped orchestrator (impure). Drives the two tokenless sources
 * (contributions fragment + github REST), handles 404 / upstream failure, and
 * hands the fetched inputs to the pure `assembleWrappedStats`.
 *
 * Contributions (free) is fetched first and gates the billed REST calls, so an
 * unknown user never triggers an integration charge.
 */

import type { WrappedStats, WrappedError } from '../../lib/wrapped/types'
import { parseContributions, fetchContributions } from './contributions'
import {
  getPublicUser,
  getUserPublicRepos,
  getRepositoryLanguages,
} from './github'
import type { GithubEnv } from './github'
import { assembleWrappedStats, isValidUsername } from './assemble'

export { isValidUsername } from './assemble'

/**
 * How many most-recently-pushed non-fork repos we sample for languages. Kept
 * low because every one is an owner-billed call; 6 still gives a representative
 * language mix while bounding the per-cold-build cost.
 */
const LANGUAGE_REPO_LIMIT = 6

export async function buildWrappedStats(
  env: GithubEnv,
  username: string,
  yearParam?: number,
): Promise<WrappedStats | WrappedError> {
  if (!isValidUsername(username)) {
    return { error: 'Invalid GitHub username.', code: 'BAD_INPUT' }
  }

  const year = yearParam ?? new Date().getUTCFullYear()
  const scopedYear = yearParam !== undefined ? yearParam : undefined

  const contrib = await fetchContributions(username, scopedYear)
  if (contrib.status === 404) {
    return { error: `No GitHub user named "${username}".`, code: 'NOT_FOUND' }
  }
  if (contrib.status === 429) {
    return { error: 'GitHub is rate-limiting us. Try again in a minute.', code: 'RATE_LIMITED' }
  }
  if (contrib.status !== 200) {
    return { error: 'GitHub did not respond. Try again in a moment.', code: 'UPSTREAM' }
  }

  const calendar = parseContributions(contrib.html)
  if (calendar.length === 0) {
    return { error: 'Could not read the contribution graph.', code: 'UPSTREAM' }
  }
  // Parse-drift guard: the day cells carry data-level even if GitHub changes the
  // separate tooltip markup we read counts from. If the graph shows activity
  // (some level > 0) but every count read as 0, the count parse has drifted — fail
  // loud instead of rendering a fabricated "quiet year" that looks entirely real.
  if (calendar.some((d) => d.level > 0) && calendar.every((d) => d.count === 0)) {
    return { error: 'Could not read the contribution counts.', code: 'UPSTREAM' }
  }

  const [profile, repos] = await Promise.all([
    getPublicUser(env, username),
    getUserPublicRepos(env, username),
  ])

  const nonForkRecent = repos.filter((r) => !r.fork).slice(0, LANGUAGE_REPO_LIMIT)
  const languageMaps = await Promise.all(
    nonForkRecent.map((r) => getRepositoryLanguages(env, username, r.name)),
  )

  return assembleWrappedStats({
    username,
    year,
    calendar,
    profile,
    repos,
    languageMaps,
  })
}
