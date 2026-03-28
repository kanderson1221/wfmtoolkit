import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
})

test('opens the public landing page and highlights the available tools', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: /Workforce Planning And Staffing Tools/i })).toBeVisible()
  await expect(page.getByRole('main').getByText('Planning Workspace', { exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByText('Erlang Tools', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Planning Workspace' }).first()).toBeVisible()
})

test('opens the planning workspace directly and creates a call center', async ({ page }) => {
  await page.goto('/#planning')

  await expect(page.getByRole('heading', { level: 1, name: 'Call Centers' })).toBeVisible()
  await page.getByRole('button', { name: 'New Center' }).first().click()

  await expect(page.getByRole('heading', { name: 'Create Call Center' })).toBeVisible()
  await page.getByLabel('Call Center Name').fill('North America Operations')
  await page.getByRole('button', { name: 'Create Call Center' }).last().click()

  await expect(page.getByRole('heading', { level: 1, name: 'North America Operations' })).toBeVisible()
})

test('opens the hamburger menu and exposes primary destinations', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'Open navigation menu' }).click()

  await expect(page.getByRole('button', { name: 'Home' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Planning Workspace' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Erlang Calculators' })).toBeVisible()
})

test('opens home-like hashes as the public landing page', async ({ page }) => {
  await page.goto('/#home')

  await expect(page.getByRole('heading', { level: 1, name: /Workforce Planning And Staffing Tools/i })).toBeVisible()

  await page.goto('/#/home')
  await expect(page.getByRole('heading', { level: 1, name: /Workforce Planning And Staffing Tools/i })).toBeVisible()

  await page.goto('/#/apps')
  await expect(page.getByRole('heading', { level: 1, name: /Workforce Planning And Staffing Tools/i })).toBeVisible()
})

test('returns to the public landing page from the app logo', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('link', { name: 'WFMToolkit home' }).click()

  await expect(page.getByRole('heading', { level: 1, name: /Workforce Planning And Staffing Tools/i })).toBeVisible()
})

test('opens the sign-in dialog from the header', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page.getByRole('heading', { name: 'Save Planning Data to Your Account' })).toBeVisible()
  await expect(page.getByText('Guest mode keeps planning data in this browser.')).toBeVisible()
})

test('opens and edits an existing call center from the portfolio list', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'New Center' }).first().click()
  await page.getByLabel('Call Center Name').fill('North America Operations')
  await page.getByRole('button', { name: 'Create Call Center' }).last().click()

  await page.goto('/#planning')

  await page
    .getByRole('row', { name: /North America Operations/ })
    .getByRole('button', { name: 'Open', exact: true })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'North America Operations' })).toBeVisible()

  await page.goto('/#planning')

  await page.getByRole('button', { name: 'Open actions for North America Operations' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()

  await expect(page.getByRole('heading', { name: 'Edit Call Center' })).toBeVisible()
  await page.getByLabel('Call Center Name').fill('United States Operations')
  await page.getByRole('button', { name: 'Save Call Center' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'United States Operations' })).toBeVisible()
})

test('confirms before deleting a call center from the portfolio list', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'New Center' }).first().click()
  await page.getByLabel('Call Center Name').fill('North America Operations')
  await page.getByRole('button', { name: 'Create Call Center' }).last().click()

  await page.goto('/#planning')

  const centerRow = page.getByRole('row', { name: /North America Operations/ })
  await expect(centerRow).toBeVisible()

  await page.getByRole('button', { name: 'Open actions for North America Operations' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()

  await expect(page.getByRole('heading', { name: 'Delete Call Center?' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(centerRow).toBeVisible()

  await page.getByRole('button', { name: 'Open actions for North America Operations' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete Call Center' }).click()

  await expect(page.getByRole('row', { name: /North America Operations/ })).toHaveCount(0)
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
  await expect(page.getByLabel('Breadcrumb').getByText('Consumer Voice', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save Plan' })).toBeVisible()
  await expect(page.locator('[data-section-id="overview"]')).toBeVisible()
  await expect(page.locator('[data-section-id="availability"]')).toBeVisible()
  await expect(page.locator('[data-section-id="variability"]')).toBeVisible()
  await expect(page.locator('[data-section-id="requirement"]')).toBeVisible()
  await expect(page.locator('[data-section-id="staffing"]')).toBeVisible()
})
