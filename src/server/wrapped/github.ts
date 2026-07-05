/**
 * Source A: the DeepSpace `github` REST integration (developer-billed, no PAT).
 *
 * Called server-side through `apiWorkerFetch`. The api-worker wraps every
 * response as `{ success, data: { <key>: <payload> }, error }`, where <key> is
 * `user` / `repositories` / `languages` / `commits`. The CLI unwraps that key;
 * the Worker does not, so this client unwraps it explicitly (with a defensive
 * fallback for the un-nested shape).
 */

import { apiWorkerFetch } from 'deepspace/worker'
import type { ApiWorkerEnv } from 'deepspace/worker'

/** What this client needs from the Worker env: the api-worker + the owner JWT. */
export type GithubEnv = ApiWorkerEnv & { APP_OWNER_JWT: string }

/** Raw GitHub user (subset we use). */
export interface RawGithubUser {
  login: string
  name: string | null
  avatar_url: string
  followers: number
  public_repos: number
  created_at: string
  bio: string | null
}

/** Raw GitHub repo (subset we use). */
export interface RawGithubRepo {
  name: string
  full_name: string
  language: string | null
  stargazers_count: number
  forks_count: number
  size: number
  created_at: string
  pushed_at: string
  fork: boolean
  default_branch: string
}

async function call<T>(
  env: GithubEnv,
  endpoint: string,
  body: Record<string, unknown>,
  key: string,
): Promise<T | null> {
  let res: Response
  try {
    res = await apiWorkerFetch(env, `/api/integrations/github/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.APP_OWNER_JWT}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    return null
  }
  if (!res.ok) return null

  let json: unknown
  try {
    json = await res.json()
  } catch {
    return null
  }

  const env_ = json as { success?: boolean; data?: Record<string, unknown>; error?: string }
  if (env_ && env_.success === false) return null
  const data = env_?.data
  if (data && key in data) return data[key] as T
  // Defensive: some shapes return the payload directly under `data`.
  if (data !== undefined && data !== null) return data as unknown as T
  return null
}

export function getPublicUser(env: GithubEnv, username: string): Promise<RawGithubUser | null> {
  return call<RawGithubUser>(env, 'get-public-user', { username }, 'user')
}

export async function getUserPublicRepos(
  env: GithubEnv,
  username: string,
): Promise<RawGithubRepo[]> {
  const repos = await call<RawGithubRepo[]>(
    env,
    'get-user-public-repos',
    { username, sort: 'pushed', per_page: 100 },
    'repositories',
  )
  return Array.isArray(repos) ? repos : []
}

export async function getRepositoryLanguages(
  env: GithubEnv,
  owner: string,
  repo: string,
): Promise<Record<string, number>> {
  const langs = await call<Record<string, number>>(
    env,
    'get-repository-languages',
    { owner, repo },
    'languages',
  )
  return langs && typeof langs === 'object' ? langs : {}
}
