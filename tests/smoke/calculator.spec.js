import { expect, test } from '@playwright/test'

test('opens the interval calculator workspace', async ({ page }) => {
  await page.goto('/#calculators/interval')

  await expect(page.getByRole('heading', { level: 1, name: 'Erlang C Calculator' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run Calculation' })).toBeVisible()
  await expect(page.getByText('Result Workspace')).toBeVisible()
})

test('opens the batch planner workspace', async ({ page }) => {
  await page.goto('/#calculators/batch')

  await expect(page.getByText('Bulk Staffing Planner')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run File Processor' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Output Workspace' })).toBeVisible()
})
