import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
})

test('opens the planning workspace and creates a call center', async ({ page }) => {
  await page.goto('/#planning')

  await expect(page.getByRole('heading', { level: 1, name: 'Call Centers' })).toBeVisible()
  await page.getByRole('button', { name: 'New Center' }).first().click()

  await expect(page.getByRole('heading', { name: 'Create Call Center' })).toBeVisible()
  await page.getByLabel('Call Center Name').fill('North America Operations')
  await page.getByRole('button', { name: 'Create Call Center' }).last().click()

  await expect(page.getByText('North America Operations', { exact: true })).toBeVisible()
})

test('opens the hamburger menu and exposes primary destinations', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'Open navigation menu' }).click()

  await expect(page.getByText('Home')).toBeVisible()
  await expect(page.getByText('Calculator Suite')).toBeVisible()
  await expect(page.getByText('Planning App')).toBeVisible()
})

test('creates a staffing group and opens a new plan from the call-center detail pane', async ({ page }) => {
  const planningYear = new Date().getFullYear()

  await page.goto('/#planning')

  await page.getByRole('button', { name: 'New Center' }).first().click()
  await page.getByLabel('Call Center Name').fill('North America Operations')
  await page.getByRole('button', { name: 'Create Call Center' }).last().click()

  await page.getByRole('button', { name: 'New Group' }).first().click()
  await expect(page.getByRole('heading', { name: 'Create Staffing Group' })).toBeVisible()
  await page.getByLabel('Staffing Group Name').fill('Consumer Voice')
  await page.getByRole('button', { name: 'Create Staffing Group' }).last().click()
  await expect(page.getByRole('heading', { name: 'Create Staffing Group' })).toBeHidden()

  await expect(page.getByRole('heading', { level: 1, name: 'North America Operations' })).toBeVisible()
  await page.getByRole('button', { name: 'New Plan' }).click()
  await expect(page.getByRole('heading', { name: 'New Plan' })).toBeVisible()
  await expect(page.getByLabel('Planning Year')).toHaveValue(String(planningYear))
  await page.getByRole('button', { name: 'Create Plan' }).click()

  await expect(page.getByRole('heading', { level: 1, name: `${planningYear} Plan` })).toBeVisible()
  await expect(page.getByLabel('Planning year')).toHaveValue(String(planningYear))
  await expect(page.locator('[data-section-id="overview"]')).toBeVisible()
  await expect(page.locator('[data-section-id="forecast"]')).toBeVisible()
  await expect(page.locator('[data-section-id="staffing"]')).toBeVisible()
})
