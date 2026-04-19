import { expect, test } from '@playwright/test'

const clearBrowserData = async (page) => {
  await page.goto('/')
  await page.evaluate(async () => {
    window.localStorage.clear()
    window.sessionStorage.clear()

    await new Promise((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('wfmtoolkit-local-data')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error || new Error('Unable to clear IndexedDB'))
      request.onblocked = () => resolve()
    })
  })
}

const waitForCenterWorkspace = async (page) => {
  await expect(page).toHaveURL(/#planning\/center\//)
}

const buildDailyActualsCsv = (dayCount = 14) => {
  const rows = ['service_date,contacts,average_handle_time_seconds']

  for (let index = 0; index < dayCount; index += 1) {
    const date = new Date(2025, 0, 1 + index, 12)
    const serviceDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-')

    rows.push(`${serviceDate},${900 + index},${280 + (index % 10)}`)
  }

  return rows.join('\n')
}

test.beforeEach(async ({ page }) => {
  await clearBrowserData(page)
})

test('opens the public landing page and highlights the available tools', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: /Practical workforce planning tools, shared free\./i })).toBeVisible()
  await expect(page.getByRole('main').getByText('Planning Workspace', { exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByText('Forecasting', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('main').getByText('Erlang Calculators', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Planning Workspace' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Call Centers' }).first()).toBeVisible()
})

test('opens the terms page from the public footer', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('contentinfo').getByRole('link', { name: 'Terms' }).click()

  await expect(page).toHaveURL(/\/terms\/index\.html$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Basic terms for using WFM Toolkit' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Planning Workspace' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open Call Centers' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open Erlang Calculators' })).toHaveCount(0)
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

test('opens staffing-group forecasts from the call-center workspace', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'New Center' }).first().click()
  await page.getByLabel('Call Center Name').fill('North America Operations')
  await page.getByRole('button', { name: 'Create Call Center' }).last().click()

  await page.getByRole('button', { name: 'New Group' }).first().click()
  await page.getByLabel('Staffing Group Name').fill('Consumer Voice')
  await page.getByRole('button', { name: 'Create Staffing Group' }).last().click()

  await page.getByRole('button', { name: 'Add actuals data for Consumer Voice' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Upload Daily Actuals' })).toBeVisible()
  await page.locator('#planning-group-actuals-upload').setInputFiles({
    name: 'consumer-voice-actuals.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildDailyActualsCsv())
  })
  await page.getByRole('button', { name: 'Add Daily Actuals' }).last().click()

  await page.getByRole('button', { name: 'Forecasts' }).click()
  await expect(page.getByText('No forecasts yet')).toBeVisible()
  await page.getByRole('button', { name: 'New Forecast' }).first().click()
  await expect(page.getByRole('heading', { name: 'New Forecast' })).toBeVisible()
  await page.getByLabel('Plan Year').selectOption({ label: '2026' })
  await page.getByRole('button', { name: 'Create Forecast' }).last().click()

  await expect(page.getByRole('heading', { level: 2, name: 'Consumer Voice 2026 Budget Forecast' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Upload Daily History' })).toBeHidden()
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

  await expect(page.getByRole('heading', { level: 1, name: /Practical workforce planning tools, shared free\./i })).toBeVisible()

  await page.goto('/#/home')
  await expect(page.getByRole('heading', { level: 1, name: /Practical workforce planning tools, shared free\./i })).toBeVisible()

  await page.goto('/#/apps')
  await expect(page.getByRole('heading', { level: 1, name: /Practical workforce planning tools, shared free\./i })).toBeVisible()
})

test('returns to the public landing page from the app logo', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('link', { name: 'WFMToolkit home' }).click()

  await expect(page.getByRole('heading', { level: 1, name: /Practical workforce planning tools, shared free\./i })).toBeVisible()
})

test('shows local data storage in the app header without a sign-in action', async ({ page }) => {
  await page.goto('/#planning')

  await expect(page.getByText('Local Data Storage')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign In' })).toHaveCount(0)
})

test('opens the local data storage dialog from the app header', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'Local Data Storage' }).click()

  await expect(page.getByRole('heading', { name: 'Local Data Storage' })).toBeVisible()
  await expect(page.getByText('Stored in this browser', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download Backup' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import Backup' })).toBeVisible()
})

test('opens and edits an existing call center from the portfolio list', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'New Center' }).first().click()
  await page.getByLabel('Call Center Name').fill('North America Operations')
  await page.getByRole('button', { name: 'Create Call Center' }).last().click()
  await waitForCenterWorkspace(page)

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
  await waitForCenterWorkspace(page)

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
  await expect(page).toHaveURL(/#planning\/center\/.+\/group\/.+\/year\/\d+/)
  await page.getByRole('button', { name: 'Plans' }).click()
  await expect(page.getByRole('button', { name: 'New Plan' })).toBeVisible()
  await page.getByRole('button', { name: 'New Plan' }).click()
  await expect(page.getByRole('heading', { name: 'New Plan' })).toBeVisible()
  await expect(page.getByLabel('Planning Year')).toHaveValue(String(planningYear))
  await page.getByRole('button', { name: 'Create Plan' }).click()

  await expect(page.getByRole('heading', { level: 1, name: `${planningYear} Plan` })).toBeVisible()
  await expect(page.getByLabel('Breadcrumb').getByText('Consumer Voice', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save Plan' })).toBeVisible()
  await expect(page.locator('[data-section-id="overview"]')).toBeVisible()
  await expect(page.locator('[data-section-id="forecast"]')).toBeVisible()
  await expect(page.locator('[data-section-id="availability"]')).toBeVisible()
  await expect(page.locator('[data-section-id="variability"]')).toBeVisible()
  await expect(page.locator('[data-section-id="requirement"]')).toBeVisible()
  await expect(page.locator('[data-section-id="staffing"]')).toBeVisible()

  await page.locator('[data-section-id="forecast"]').click()
  await expect(page.getByText('Demand Source')).toBeVisible()
  await expect(page.getByText('No saved forecasts available')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Manual Monthly Inputs' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open Staffing Group Forecasts' })).toHaveCount(0)
  await expect(page.getByLabel('Forecast workflow').getByRole('button', { name: /Data/ })).toHaveCount(0)
})
