import { expect, test } from '@playwright/test'

test('renders the app shell', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Documentation navigation' })
  await expect(navigation.getByRole('button', { name: 'Getting Started', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(navigation.getByRole('button', { name: 'Widgets', exact: true })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Installation', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Installation' })).toBeVisible()
  await page.getByRole('button', { name: 'Widgets', exact: true }).click()
  await page.getByRole('button', { name: 'Button', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Button' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Primary' })).toBeVisible()
})
