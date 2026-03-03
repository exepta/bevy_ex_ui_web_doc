import { expect, test } from '@playwright/test'

test('renders the app shell', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Documentation navigation' })
  await expect(navigation.getByRole('button', { name: 'Getting Started', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await expect(navigation.getByRole('button', { name: 'Overview', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bevy Extended UI - Overview' })).toBeVisible()
})
