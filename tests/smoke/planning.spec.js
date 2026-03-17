import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
})

test('opens the planning workspace and creates a call center', async ({ page }) => {
  await page.goto('/#planning')

  await expect(page.getByRole('heading', { level: 1, name: 'Call Centers' })).toBeVisible()
  await page.getByRole('button', { name: 'Create Call Center' }).first().click()

  await expect(page.getByRole('heading', { name: 'Create Call Center' })).toBeVisible()
  await page.getByLabel('Call Center Name').fill('North America Operations')
  await page.getByRole('button', { name: 'Create Call Center' }).last().click()

  await expect(page.getByText('North America Operations')).toBeVisible()
})

test('opens the hamburger menu and exposes primary destinations', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'Open navigation menu' }).click()

  await expect(page.getByText('Home')).toBeVisible()
  await expect(page.getByText('Calculator Suite')).toBeVisible()
  await expect(page.getByText('Planning App')).toBeVisible()
})
