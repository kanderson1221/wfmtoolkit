import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const planUpdateReviewFixturePath = fileURLToPath(
  new URL('../fixtures/plan-update-decision-review.json', import.meta.url)
)
const forecastCandidateComparisonFixturePath = fileURLToPath(
  new URL('../fixtures/forecast-candidate-comparison.json', import.meta.url)
)

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

const importLocalBackup = async (page, fixturePath, expectedFileName = '') => {
  await page.getByRole('button', { name: 'Local Data Storage' }).click()
  const storageDialog = page.getByRole('dialog').filter({ hasText: 'Review what is stored in this browser' })
  await storageDialog.getByLabel('Import local data backup').setInputFiles(fixturePath)

  const importDialog = page.getByRole('dialog').filter({ hasText: 'Importing this backup will replace' })
  if (expectedFileName) {
    await expect(importDialog.getByText(expectedFileName)).toBeVisible()
  }
  await importDialog.getByRole('button', { name: 'Replace Local Data' }).click()
  await expect(storageDialog.getByText('Local data backup imported.')).toBeVisible()
  await storageDialog.getByRole('button', { name: 'Close' }).click()
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
    buffer: Buffer.from(buildDailyActualsCsv(30))
  })
  await page.getByRole('button', { name: 'Add Daily Actuals' }).last().click()

  await page.getByRole('button', { name: 'Forecasts' }).click()
  await expect(page.getByText('No forecasts yet')).toBeVisible()
  await page.getByRole('button', { name: 'New Forecast' }).first().click()
  const forecastCreateDialog = page.getByRole('dialog').filter({ hasText: 'Choose the forecast source and period for this staffing group.' })
  await expect(forecastCreateDialog).toBeVisible()
  await expect(forecastCreateDialog.getByLabel('Forecast Source')).toHaveValue('modeled_daily')
  await forecastCreateDialog.getByLabel('Forecast Year').selectOption({ label: '2026' })
  await page.getByRole('button', { name: /Build Forecast/ }).last().click()

  await expect(page.getByRole('heading', { level: 2, name: 'Consumer Voice 2026 Demand Forecast' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Upload Daily History' })).toBeHidden()
})

test('compares saved forecast candidates on identical holdout actuals', async ({ page }) => {
  await page.goto('/#planning')
  await importLocalBackup(page, forecastCandidateComparisonFixturePath)

  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await page.getByText('Consumer Voice', { exact: true }).click()
  await page.getByRole('button', { name: 'Forecasts', exact: true }).click()
  await page.getByRole('link', { name: 'Open Reference Forecast for Consumer Voice' }).click()

  await expect(page.getByRole('heading', { name: 'Accuracy across historical cutoffs' })).toBeVisible()
  await expect(page.getByText('lower WAPE than the weekday baseline in 2 of 3 comparable windows')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download Stability CSV' })).toBeVisible()
  await expect(page.getByRole('row', { name: /Current window/ })).toContainText('Model lower')

  const compareTrigger = page.getByRole('button', { name: 'Compare Forecasts' })
  await expect(compareTrigger).toBeVisible()
  await compareTrigger.click()

  const comparisonDialog = page.getByRole('dialog').filter({ hasText: 'Compare two saved model configurations' })
  await expect(comparisonDialog.getByLabel('Reference forecast')).toBeFocused()
  await expect(comparisonDialog.getByText('Identical dated actual contacts verified.')).toBeVisible()
  await expect(comparisonDialog.getByText('Candidate Forecast has 2.3 percentage points lower WAPE')).toBeVisible()
  await expect(comparisonDialog.getByText('comparative evidence, not an automatic acceptance decision', { exact: false })).toBeVisible()
  await expect(comparisonDialog.getByRole('cell', { name: 'Changed', exact: true })).toHaveCount(3)

  await comparisonDialog.getByRole('button', { name: 'Close' }).click()
  await expect(comparisonDialog).toBeHidden()
  await expect(compareTrigger).toBeFocused()
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

test('keeps destructive confirmation focus on the safe action and restores its trigger', async ({ page }) => {
  await page.goto('/#planning')

  await page.getByRole('button', { name: 'Local Data Storage' }).click()

  const storageDialog = page.getByRole('dialog').filter({ hasText: 'Review what is stored in this browser' })
  const clearButton = storageDialog.getByRole('button', { name: 'Clear All Local Data' })
  await clearButton.click()

  const confirmationDialog = page.getByRole('dialog').filter({ hasText: 'This cannot be undone' })
  const cancelButton = confirmationDialog.getByRole('button', { name: 'Cancel' })
  await expect(cancelButton).toBeFocused()

  await cancelButton.click()

  await expect(confirmationDialog).toBeHidden()
  await expect(clearButton).toBeFocused()

  await clearButton.click()
  await expect(cancelButton).toBeFocused()
  await confirmationDialog.getByRole('button', { name: 'Clear All Local Data' }).click()

  await expect(confirmationDialog).toBeHidden()
  await expect(clearButton).toBeFocused()
  await expect(storageDialog.getByText('All local planning data was cleared.')).toBeVisible()
})

test('requires and exposes updated-plan decision reasons across the desktop workflow', async ({ page }) => {
  await page.goto('/#planning')
  await importLocalBackup(page, planUpdateReviewFixturePath, 'plan-update-decision-review.json')

  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await page.getByText('Customer Care', { exact: true }).click()
  await page.getByRole('button', { name: 'Plans', exact: true }).click()

  await expect(page.getByText('Approved product launch and revised spring demand outlook')).toBeVisible()
  await expect(page.getByText('Decision reason not recorded (legacy plan)')).toBeVisible()

  const createUpdateTrigger = page.getByRole('button', { name: 'Create Updated Plan', exact: true })
  await createUpdateTrigger.click()

  const updateDialog = page.getByRole('dialog').filter({ hasText: 'Copy the selected plan, actualize closed months' })
  await expect(updateDialog.getByLabel('Actuals Through')).toBeFocused()
  await expect(updateDialog.getByRole('button', { name: 'Create Updated Plan' })).toBeDisabled()
  await updateDialog.getByLabel('Decision Reason (required)').fill('Approved service launch and revised volume outlook')
  await expect(updateDialog.getByRole('button', { name: 'Create Updated Plan' })).toBeEnabled()
  await updateDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(updateDialog).toBeHidden()
  await expect(createUpdateTrigger).toBeFocused()

  await page.getByRole('button', { name: 'Compare Plans' }).click()
  const comparisonDialog = page.getByRole('dialog').filter({ hasText: 'Candidate minus baseline is shown' })
  await expect(comparisonDialog.getByRole('row', { name: /Decision reason/ })).toContainText(
    'Approved product launch and revised spring demand outlook'
  )
})

test('keeps annual-plan readiness visible across desktop widths', async ({ page }) => {
  await page.goto('/#planning')
  await importLocalBackup(page, planUpdateReviewFixturePath)

  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await page.getByText('Customer Care', { exact: true }).click()
  await page.getByRole('button', { name: 'Plans', exact: true }).click()
  await page.getByRole('link', { name: 'Open 2026 Spring Outlook plan for Customer Care' }).click()

  await expect(page.getByRole('navigation', { name: 'Staffing group workflow' })).toBeVisible()
  await expect(page.locator('[data-section-id="forecast"] span')).toHaveText('Legacy manual')
  await expect(page.locator('[data-section-id="availability"] span')).toHaveText('12/12 months')
  await expect(page.locator('[data-section-id="variability"] span')).toHaveText('Defaults confirmed')
  await expect(page.locator('[data-section-id="requirement"] span')).toHaveText('12/12 months')
  await expect(page.locator('[data-section-id="staffing"] span')).toHaveText('0/2 required')
  await expect(page.locator('[data-section-id="actuals"] span')).toHaveText('1 month')

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 1152, height: 720 }
  ]) {
    await page.setViewportSize(viewport)

    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }))

    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth)
    await expect(page.locator('[data-section-id] span')).toHaveCount(6)
  }
})

test('keeps call-center reconciliation context visible while expanded months scroll', async ({ page }) => {
  await page.goto('/#planning')
  await importLocalBackup(page, planUpdateReviewFixturePath)

  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Call Center Plan' })).toBeVisible()
  await page.getByRole('button', { name: 'Expand All' }).click()

  const reportRegion = page.getByRole('region', { name: 'Call center monthly plan and actuals' })
  await expect(reportRegion).toBeVisible()

  const beforeScroll = await reportRegion.evaluate((region) => ({
    clientHeight: region.clientHeight,
    clientWidth: region.clientWidth,
    scrollHeight: region.scrollHeight,
    scrollWidth: region.scrollWidth
  }))
  expect(beforeScroll.scrollHeight).toBeGreaterThan(beforeScroll.clientHeight)
  expect(beforeScroll.scrollWidth).toBeGreaterThan(beforeScroll.clientWidth)

  await reportRegion.evaluate((region) => {
    const monthRow = region.querySelector('tr[data-month-start="2026-06-01"]')
    region.scrollTop = monthRow.offsetTop + 20
    region.scrollLeft = 160
  })

  const stickyPositions = await reportRegion.evaluate((region) => {
    const header = region.querySelector('thead').getBoundingClientRect()
    const monthHeader = region.querySelector('thead th[scope="col"]').getBoundingClientRect()
    const monthRow = region.querySelector('tr[data-month-start="2026-06-01"]').getBoundingClientRect()
    const regionBox = region.getBoundingClientRect()

    return {
      headerTop: header.top,
      headerBottom: header.bottom,
      monthHeaderLeft: monthHeader.left,
      monthRowTop: monthRow.top,
      regionLeft: regionBox.left,
      regionTop: regionBox.top,
      scrollLeft: region.scrollLeft,
      scrollTop: region.scrollTop
    }
  })

  expect(stickyPositions.scrollTop).toBeGreaterThan(0)
  expect(stickyPositions.scrollLeft).toBeGreaterThan(0)
  expect(Math.abs(stickyPositions.headerTop - stickyPositions.regionTop)).toBeLessThanOrEqual(2)
  expect(Math.abs(stickyPositions.monthRowTop - stickyPositions.headerBottom)).toBeLessThanOrEqual(2)
  expect(Math.abs(stickyPositions.monthHeaderLeft - stickyPositions.regionLeft)).toBeLessThanOrEqual(2)
})

test('opens and edits an existing call center from the call-center list', async ({ page }) => {
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

test('confirms before deleting a call center from the call-center list', async ({ page }) => {
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
  await expect(page.getByLabel('Planning Year')).toHaveValue('')
  await expect(
    page.getByText('Create and save a staffing-group forecast for Consumer Voice before creating a plan.')
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Plan' })).toBeDisabled()
})
