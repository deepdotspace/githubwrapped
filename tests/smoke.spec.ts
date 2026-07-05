import { test, expect } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'

/**
 * Smoke tests for GitHub Wrapped. The app is a full-bleed immersive story (no
 * nav shell), so we assert against the landing hero, the story route, and the
 * friendly error state rather than the scaffold's default navigation.
 */
test.describe('GitHub Wrapped smoke', () => {
  test('landing loads without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/')
    await expect(page.getByRole('button', { name: /wrap it/i })).toBeVisible({ timeout: 15000 })
    expect(errors).toEqual([])
  })

  test('an example user opens the story', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '@torvalds' }).click()
    await expect(page).toHaveURL(/\/torvalds$/)
    // The landing hero is replaced by the story (boot -> intro -> sections).
    await expect(page.getByRole('button', { name: /wrap it/i })).toHaveCount(0)
  })

  test('a hard-loaded story route renders the story, not the landing', async ({ page }) => {
    await page.goto('/torvalds')
    await expect(page).toHaveURL(/\/torvalds$/)
    await expect(page.getByRole('button', { name: /wrap it/i })).toHaveCount(0)
  })

  test('an unknown user shows a friendly error', async ({ page }) => {
    await page.goto('/this-user-surely-does-not-exist-xyz123')
    await expect(
      page.getByText(/no github user by that name/i),
    ).toBeVisible({ timeout: 20000 })
  })
})
