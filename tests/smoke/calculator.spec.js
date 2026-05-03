import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
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
})

test('opens the interval calculator workspace', async ({ page }) => {
  await page.goto('/#calculators/interval')

  await expect(page.getByRole('heading', { level: 1, name: 'Erlang Calculators' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Erlang Calculators' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Forecasting' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open Forecasting Workspace' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Run Calculation' })).toBeVisible()
  await expect(page.getByText('Recommendation Workspace')).toBeVisible()
})

test('opens the batch planner workspace', async ({ page }) => {
  await page.goto('/#calculators/batch')

  await expect(page.getByText('CSV Staffing File Processor')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run File Processor' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Output Workspace' })).toBeVisible()
})

test('legacy forecasting calculator hash redirects to planning home', async ({ page }) => {
  await page.goto('/#calculators/forecasting')

  await expect(page.getByRole('heading', { level: 1, name: 'Erlang Calculators' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 3, name: 'Erlang Calculators' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 2, name: 'Untitled Forecast' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'Planning Portfolio' })).toBeVisible()
})
