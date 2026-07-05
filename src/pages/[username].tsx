/**
 * /:username — the story route.
 *
 * Fetches GET /api/wrapped/:username and renders the full 11-section story from
 * the real WrappedStats. States:
 *   - loading  -> WrappedBoot (the mascot "booting up your year...")
 *   - error/404 -> WrappedError ("we could not find that GitHub user" + retry)
 *   - success  -> WrappedStory (the quiet-year path is handled inside the copy
 *                 the server already filled into stats.copy; visuals stay celebratory)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { WrappedStats, WrappedResponse } from '../lib/wrapped/types'
import { isWrappedError } from '../lib/wrapped/types'
import { WrappedStory } from '../components/wrapped/WrappedStory'
import { WrappedBoot, WrappedError } from '../components/wrapped/WrappedStates'

type Status =
  | { phase: 'loading' }
  | { phase: 'ready'; stats: WrappedStats }
  | { phase: 'error'; message: string }

export default function UsernameStory() {
  const { username = '' } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)

  const reqId = useRef(0)
  const load = useCallback(async () => {
    const myId = ++reqId.current
    setStatus({ phase: 'loading' })
    try {
      const res = await fetch(`/api/wrapped/${encodeURIComponent(username)}`, {
        headers: { accept: 'application/json' },
      })
      let data: WrappedResponse | null = null
      try {
        data = (await res.json()) as WrappedResponse
      } catch {
        /* non-JSON body; handled as a generic error below */
      }
      if (reqId.current !== myId) return // a newer load() superseded this one
      if (!res.ok || !data || isWrappedError(data)) {
        const message =
          res.status === 404
            ? 'No GitHub user by that name, or no public activity this year.'
            : res.status === 429
              ? 'GitHub is rate-limiting us right now. Give it a minute.'
              : data && isWrappedError(data)
                ? data.error // surface the server's real reason (e.g. invalid username on a 400)
                : 'Something went wrong wrapping that year. Try again.'
        return setStatus({ phase: 'error', message })
      }
      setStatus({ phase: 'ready', stats: data })
    } catch {
      if (reqId.current !== myId) return
      setStatus({ phase: 'error', message: 'We could not reach the server. Check your connection and try again.' })
    }
  }, [username])

  useEffect(() => {
    load()
  }, [load, attempt])

  if (status.phase === 'loading') return <WrappedBoot username={username} />
  if (status.phase === 'error') {
    return (
      <WrappedError
        username={username}
        message={status.message}
        onRetry={() => setAttempt((a) => a + 1)}
        onHome={() => navigate('/')}
      />
    )
  }
  return <WrappedStory stats={status.stats} />
}
