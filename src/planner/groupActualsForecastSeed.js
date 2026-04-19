import { createPlanningGroupActuals } from './groupActuals'

export const MINIMUM_FORECAST_HISTORY_DAYS = 14

const createForecastHistoryRow = (row = {}) => {
  const serviceDate = String(row.serviceDate || '').trim()
  const contacts = Number(row.contacts)

  if (!serviceDate || !Number.isFinite(contacts) || contacts < 0) {
    return null
  }

  return {
    ds: serviceDate,
    y: contacts,
    cap: null,
    floor: null,
    holidayLabel: ''
  }
}

const createForecastAhtHistoryRow = (row = {}) => {
  const serviceDate = String(row.serviceDate || '').trim()
  const contacts = Number(row.contacts)
  const ahtSeconds = Number(row.ahtSeconds)

  if (
    !serviceDate ||
    !Number.isFinite(contacts) ||
    contacts < 0 ||
    !Number.isFinite(ahtSeconds) ||
    ahtSeconds < 0
  ) {
    return null
  }

  return {
    ds: serviceDate,
    contacts,
    ahtSeconds
  }
}

// Keep the staffing-group-history -> forecast-training mapping at this boundary so
// future AHT-aware forecasting can extend the same shared-history source without
// changing the planning callers again.
export const buildForecastTrainingSeedFromPlanningGroupActuals = (actuals = {}) => {
  const normalizedActuals = createPlanningGroupActuals(actuals)
  const historyRows = normalizedActuals.dailyRows
    .map((row) => createForecastHistoryRow(row))
    .filter(Boolean)
  const ahtHistoryRows = normalizedActuals.dailyRows
    .map((row) => createForecastAhtHistoryRow(row))
    .filter(Boolean)

  return {
    historyRows,
    ahtHistoryRows
  }
}

export const hasMinimumForecastTrainingHistory = (
  actuals = {},
  minimumDays = MINIMUM_FORECAST_HISTORY_DAYS
) => buildForecastTrainingSeedFromPlanningGroupActuals(actuals).historyRows.length >= minimumDays
