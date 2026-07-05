import { test, expect } from '@playwright/test'

/**
 * API tests for the GitHub Wrapped data layer. The unknown-user case is free
 * (the contributions fetch gates the billed REST calls, so a 404 never bills).
 * The known-user case makes one real set of github-integration calls per run.
 */
test.describe('GitHub Wrapped API', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('unknown user returns a clean 404 (no billed calls)', async ({ request }) => {
    const res = await request.get('/api/wrapped/this-user-surely-does-not-exist-xyz123')
    expect(res.status()).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('NOT_FOUND')
  })

  test('a known user returns real WrappedStats', async ({ request }) => {
    const res = await request.get('/api/wrapped/torvalds')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(String(body.username).toLowerCase()).toBe('torvalds')
    expect(body.totalContributions).toBeGreaterThan(0)
    expect(body.personality?.name).toBeTruthy()
    expect(Array.isArray(body.calendar)).toBeTruthy()
    expect(body.cardStats?.length).toBe(4)
  })
})
