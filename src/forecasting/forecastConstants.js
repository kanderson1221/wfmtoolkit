export const FORECAST_RESULT_TABS = [
  { id: 'daily', label: 'Contacts' },
  { id: 'aht', label: 'AHT' },
  { id: 'monthly', label: 'Monthly Rollup' }
]

export const FORECAST_TYPE_BUDGET = 'budget'
export const FORECAST_SOURCE_MODELED_DAILY = 'modeled_daily'
export const FORECAST_SOURCE_IMPORTED_DAILY = 'imported_daily'
export const FORECAST_SOURCE_MANUAL_MONTHLY = 'manual_monthly'

export const FORECAST_TYPE_OPTIONS = [
  { label: 'Budget Forecast', value: FORECAST_TYPE_BUDGET }
]

export const FORECAST_SOURCE_KIND_OPTIONS = [
  {
    id: FORECAST_SOURCE_MODELED_DAILY,
    label: 'Build Forecast',
    description: 'Upload history and generate a modeled daily forecast.'
  },
  {
    id: FORECAST_SOURCE_IMPORTED_DAILY,
    label: 'Import Daily Forecast',
    description: 'Upload existing daily contacts and average handle time without using Prophet.'
  },
  {
    id: FORECAST_SOURCE_MANUAL_MONTHLY,
    label: 'Enter Monthly Forecast',
    description: 'Enter monthly contacts directly for this staffing group.'
  }
]

export const FORECAST_HORIZON_PRESETS = [
  { id: '30', label: '30 Days', value: 30 },
  { id: '90', label: '90 Days', value: 90 },
  { id: '180', label: '180 Days', value: 180 },
  { id: '365', label: '365 Days', value: 365 },
  { id: 'custom', label: 'Custom', value: null }
]

export const GROWTH_OPTIONS = [
  { label: 'Linear', value: 'linear' },
  { label: 'Logistic', value: 'logistic' },
  { label: 'Flat', value: 'flat' }
]

export const SEASONALITY_MODE_OPTIONS = [
  { label: 'Additive', value: 'additive' },
  { label: 'Multiplicative', value: 'multiplicative' }
]

export const FORECAST_WEEKLY_SEASONALITY_DEFAULTS = {
  fourierOrder: 3,
  priorScale: 10
}

export const FORECAST_YEARLY_SEASONALITY_DEFAULTS = {
  fourierOrder: 10,
  priorScale: 10
}

export const FORECAST_MONTHLY_SEASONALITY_DEFAULTS = {
  periodDays: 30.5,
  fourierOrder: 5,
  priorScale: 10
}

export const HOLIDAY_CALENDAR_OPTIONS = [
  { label: 'No built-in holidays', value: '' },
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Australia', value: 'AU' }
]

const resolveDefaultTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  } catch {
    return 'America/New_York'
  }
}

export const clonePlain = (value) => JSON.parse(JSON.stringify(value))

export const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const createForecastEntityId = (prefix = 'forecast') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const DEFAULT_FORECAST_TIMEZONE = resolveDefaultTimeZone()
