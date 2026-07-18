import { computed, ref, watch } from 'vue'

import {
  buildPlanningGroupForecastsHash,
  buildPlanningGroupNewForecastHash,
  navigateToHash
} from '../../appRoutes'
import {
  FORECAST_SOURCE_IMPORTED_DAILY,
  FORECAST_SOURCE_MANUAL_MONTHLY,
  FORECAST_SOURCE_MODELED_DAILY,
  FORECAST_TYPE_BUDGET,
  buildMonthEndDate
} from '../../forecasting/shared'
import { DEMAND_SOURCE_FORECAST } from '../../planner/demandSources'
import { resolvePlanningGroupActuals } from '../../planner/groupActuals'
import {
  PLAN_STATUS_DRAFT,
  PLAN_TYPE_UPDATE,
  normalizePlanStatus
} from '../../planningStorage'
import { currentYear } from '../monthlyPlanBuilder/shared'

const FORECAST_PERIOD_FULL_YEAR = 'full_year'
const FORECAST_PERIOD_CUSTOM_RANGE = 'custom_range'
const MAX_SUPPORTED_FORECAST_HORIZON_DAYS = 730
const DAY_IN_MS = 24 * 60 * 60 * 1000

const buildMonthStart = (year, monthIndex) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`

const buildUtcDateFromIso = (value) => {
  const [year, month, day] = String(value || '').split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  return new Date(Date.UTC(year, month - 1, day))
}

const addUtcDays = (date, days) => new Date(date.getTime() + days * DAY_IN_MS)

const buildYearRange = (startYear, endYear) => {
  if (
    !Number.isInteger(startYear) ||
    !Number.isInteger(endYear) ||
    startYear <= 0 ||
    endYear < startYear
  ) {
    return []
  }

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
}

const getActualHistoryWindow = (group) => {
  const dailyRows = resolvePlanningGroupActuals(group).dailyRows
  const firstServiceDate = dailyRows[0]?.serviceDate || ''
  const latestServiceDate = dailyRows[dailyRows.length - 1]?.serviceDate || ''
  const firstDate = buildUtcDateFromIso(firstServiceDate)
  const latestDate = buildUtcDateFromIso(latestServiceDate)

  if (!firstDate || !latestDate) {
    return {
      firstDate: null,
      latestDate: null,
      firstYear: null,
      latestYear: null
    }
  }

  return {
    firstDate,
    latestDate,
    firstYear: firstDate.getUTCFullYear(),
    latestYear: latestDate.getUTCFullYear()
  }
}

const isModeledFullYearWithinHorizon = (year, latestHistoryDate) => {
  if (!Number.isInteger(year) || !latestHistoryDate) {
    return false
  }

  const coverageEndDate = new Date(Date.UTC(year, 11, 31))
  const requiredHorizonDays = Math.ceil((coverageEndDate.getTime() - latestHistoryDate.getTime()) / DAY_IN_MS)

  return requiredHorizonDays >= 0 && requiredHorizonDays <= MAX_SUPPORTED_FORECAST_HORIZON_DAYS
}

const getYearFromMonthStart = (value) => {
  const year = Number(String(value || '').slice(0, 4))
  return Number.isInteger(year) && year > 0 ? year : null
}

const formatMonthOptionLabel = (monthStart) => {
  const [yearText, monthText] = String(monthStart || '').split('-')
  const year = Number(yearText)
  const monthIndex = Number(monthText) - 1

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return String(monthStart || '')
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(year, monthIndex, 1))
}

const buildPlanDependencyLabel = (plan = {}) => {
  const explicitName = String(plan.name || '').trim()
  const planningYear = Number(plan.planningYear) || 0
  const planType = String(plan.planType || '').trim().toLowerCase()
  const fallbackType = planType === PLAN_TYPE_UPDATE ? 'Update' : 'Budget'
  const planName = explicitName || (planningYear ? `${planningYear} ${fallbackType}` : fallbackType)
  const planState = normalizePlanStatus(plan.status, planType) === PLAN_STATUS_DRAFT
    ? 'draft'
    : 'finalized'

  return `${planName} (${planState})`
}

const findForecastDependentPlans = (plans = [], forecastId = '') => {
  const normalizedForecastId = String(forecastId || '').trim()

  if (!normalizedForecastId) {
    return []
  }

  return (Array.isArray(plans) ? plans : []).filter((plan) =>
    plan?.demandSource?.mode === DEMAND_SOURCE_FORECAST &&
    String(plan?.demandSource?.forecastProjectId || '').trim() === normalizedForecastId
  )
}

export function usePlanningGroupForecastActions({
  center,
  selectedGroup,
  selectedYearModel,
  forecastRows,
  canLaunchModeledForecast,
  requestConfirmation,
  deleteForecast,
  onMissingHistory
}) {
  const forecastCreateOpen = ref(false)
  const newForecastYear = ref('')
  const newForecastSourceKind = ref(FORECAST_SOURCE_MODELED_DAILY)
  const newForecastPeriodMode = ref(FORECAST_PERIOD_FULL_YEAR)
  const newForecastCoverageStartMonth = ref('')
  const newForecastCoverageEndMonth = ref('')
  const selectedForecastId = ref('')

  const actualHistoryWindow = computed(() => getActualHistoryWindow(selectedGroup.value))

  const baseForecastYears = computed(() => {
    const yearSet = new Set(
      Array.from({ length: 3 }, (_, index) => currentYear + index)
    )

    if (Number(selectedYearModel.value) > 0) {
      yearSet.add(Number(selectedYearModel.value))
    }

    ;(selectedGroup.value?.plans || []).forEach((plan) => {
      const planningYear = Number(plan?.planningYear)
      if (planningYear > 0) {
        yearSet.add(planningYear)
      }
    })

    ;(forecastRows.value || []).forEach((forecast) => {
      const planningYear = Number(forecast?.planningYear)
      if (planningYear > 0) {
        yearSet.add(planningYear)
      }

      const coverageStartYear = getYearFromMonthStart(forecast?.coverageStartDate)
      const coverageEndYear = getYearFromMonthStart(forecast?.coverageEndDate)
      if (coverageStartYear) {
        yearSet.add(coverageStartYear)
      }
      if (coverageEndYear) {
        yearSet.add(coverageEndYear)
      }
    })

    if (actualHistoryWindow.value.latestYear) {
      buildYearRange(actualHistoryWindow.value.latestYear, currentYear + 2)
        .forEach((year) => yearSet.add(year))
    }

    return yearSet
  })

  const modeledForecastYears = computed(() => {
    const { latestDate, latestYear } = actualHistoryWindow.value
    if (!latestDate || !latestYear) {
      return []
    }

    const horizonEndDate = addUtcDays(latestDate, MAX_SUPPORTED_FORECAST_HORIZON_DAYS)
    const horizonEndYear = horizonEndDate.getUTCFullYear()

    return buildYearRange(latestYear, horizonEndYear)
      .filter((year) => year === latestYear || isModeledFullYearWithinHorizon(year, latestDate))
  })

  const forecastYearOptions = computed(() => {
    const yearSet = newForecastSourceKind.value === FORECAST_SOURCE_MODELED_DAILY && modeledForecastYears.value.length
      ? new Set(modeledForecastYears.value)
      : new Set(baseForecastYears.value)

    return [...yearSet]
      .filter((year) => Number.isInteger(year) && year > 0)
      .sort((left, right) => right - left)
      .map((year) => ({
        label: String(year),
        value: year
      }))
  })

  const forecastMonthOptions = computed(() =>
    [...forecastYearOptions.value]
      .map((option) => Number(option.value))
      .filter((year) => Number.isInteger(year) && year > 0)
      .sort((left, right) => left - right)
      .flatMap((year) =>
        Array.from({ length: 12 }, (_, monthIndex) => {
          const monthStart = buildMonthStart(year, monthIndex)
          return {
            label: formatMonthOptionLabel(monthStart),
            value: monthStart
          }
        })
      )
  )

  const forecastCoverageDates = computed(() => {
    const planningYear = Number(newForecastYear.value)

    if (newForecastPeriodMode.value !== FORECAST_PERIOD_CUSTOM_RANGE) {
      return Number.isInteger(planningYear) && planningYear > 0
        ? {
            coverageStartDate: `${planningYear}-01-01`,
            coverageEndDate: `${planningYear}-12-31`,
            planningYear
          }
        : {
            coverageStartDate: '',
            coverageEndDate: '',
            planningYear: null
          }
    }

    const coverageStartDate = String(newForecastCoverageStartMonth.value || '').trim()
    const coverageEndDate = buildMonthEndDate(newForecastCoverageEndMonth.value)
    const coverageStartYear = getYearFromMonthStart(coverageStartDate)

    return {
      coverageStartDate,
      coverageEndDate,
      planningYear: coverageStartYear || planningYear || null
    }
  })

  const forecastCoverageMessage = computed(() => {
    if (!forecastCoverageDates.value.coverageStartDate || !forecastCoverageDates.value.coverageEndDate) {
      return 'Choose a complete forecast period before creating this forecast.'
    }

    if (forecastCoverageDates.value.coverageStartDate > forecastCoverageDates.value.coverageEndDate) {
      return 'Forecast period start month must be on or before the end month.'
    }

    return ''
  })

  const openForecastCreate = () => {
    if (!selectedGroup.value) {
      return
    }

    newForecastSourceKind.value = FORECAST_SOURCE_MODELED_DAILY
    const selectedYear = Number(selectedYearModel.value) > 0 ? Number(selectedYearModel.value) : currentYear
    const availableYears = forecastYearOptions.value.map((option) => Number(option.value))
    newForecastYear.value = availableYears.includes(selectedYear)
      ? selectedYear
      : availableYears[0] || selectedYear
    newForecastPeriodMode.value = FORECAST_PERIOD_FULL_YEAR
    newForecastCoverageStartMonth.value = `${newForecastYear.value}-01-01`
    newForecastCoverageEndMonth.value = `${newForecastYear.value}-12-01`
    selectedForecastId.value = ''
    forecastCreateOpen.value = true
  }

  const closeForecastCreate = () => {
    forecastCreateOpen.value = false
  }

  const selectForecast = (forecastId) => {
    selectedForecastId.value = String(forecastId || '').trim()
  }

  const buildForecastOpenHref = (forecast) => {
    if (!selectedGroup.value) {
      return ''
    }

    const planningYear = Number(forecast?.planningYear) || Number(selectedYearModel.value) || currentYear

    return buildPlanningGroupForecastsHash(
      center.value.id,
      selectedGroup.value.id,
      planningYear,
      forecast?.id
    )
  }

  const openForecast = (forecast) => {
    selectForecast(forecast?.id)
    navigateToHash(buildForecastOpenHref(forecast))
  }

  const canCreateForecast = computed(() => {
    const planningYear = Number(forecastCoverageDates.value.planningYear)
    const sourceKind = String(newForecastSourceKind.value || '').trim()

    if (
      !selectedGroup.value ||
      !Number.isInteger(planningYear) ||
      planningYear <= 0 ||
      forecastCoverageMessage.value
    ) {
      return false
    }

    if (sourceKind === FORECAST_SOURCE_MODELED_DAILY) {
      return canLaunchModeledForecast.value
    }

    return sourceKind === FORECAST_SOURCE_IMPORTED_DAILY || sourceKind === FORECAST_SOURCE_MANUAL_MONTHLY
  })

  const createForecast = () => {
    if (!selectedGroup.value) {
      return
    }

    if (!canCreateForecast.value) {
      if (newForecastSourceKind.value === FORECAST_SOURCE_MODELED_DAILY) {
        onMissingHistory?.()
      }
      return
    }

    const planningYear = Number(forecastCoverageDates.value.planningYear)
    const sourceKind = String(newForecastSourceKind.value || FORECAST_SOURCE_MODELED_DAILY).trim()

    forecastCreateOpen.value = false
    selectedForecastId.value = ''
    navigateToHash(
      buildPlanningGroupNewForecastHash(center.value.id, selectedGroup.value.id, planningYear, {
        sourceKind,
        forecastType: FORECAST_TYPE_BUDGET,
        coverageStartDate: forecastCoverageDates.value.coverageStartDate,
        coverageEndDate: forecastCoverageDates.value.coverageEndDate
      })
    )
  }

  const buildForecastMenuItems = () => [
    {
      id: 'delete-forecast',
      label: 'Delete'
    }
  ]

  const confirmDeleteForecast = (forecast) => {
    const dependentPlans = findForecastDependentPlans(selectedGroup.value?.plans, forecast?.id)
    const savedPlanProtection = dependentPlans.length === 1
      ? 'does not delete this plan or change its saved demand values and snapshot'
      : 'does not delete these plans or change their saved demand values and snapshots'
    const dependencyDescription = dependentPlans.length
      ? `This forecast is used by ${dependentPlans.length} saved ${dependentPlans.length === 1 ? 'plan' : 'plans'}: ${dependentPlans.map(buildPlanDependencyLabel).join('; ')}. Deleting it removes the source from future selection and access, but ${savedPlanProtection}.`
      : 'No saved plans use this forecast. Deleting it removes the source from future selection and access on this device.'

    requestConfirmation({
      title: 'Delete Forecast?',
      description: `Delete the saved forecast "${forecast.name}" from ${selectedGroup.value?.name || 'this staffing group'}? ${dependencyDescription}`,
      confirmLabel: 'Delete Forecast',
      onConfirm: () => {
        void deleteForecast(forecast)
      }
    })
  }

  const handleForecastMenuSelect = (forecast, item) => {
    if (item.id === 'delete-forecast') {
      confirmDeleteForecast(forecast)
    }
  }

  watch(
    [selectedGroup, forecastRows],
    ([group, rows]) => {
      if (!group) {
        selectedForecastId.value = ''
        return
      }

      if (rows.some((forecast) => forecast.id === selectedForecastId.value)) {
        return
      }

      selectedForecastId.value = rows[0]?.id || ''
    },
    { immediate: true }
  )

  watch(forecastYearOptions, (yearOptions) => {
    if (!forecastCreateOpen.value) {
      return
    }

    const availableYears = yearOptions.map((option) => Number(option.value))
    if (!availableYears.length || availableYears.includes(Number(newForecastYear.value))) {
      return
    }

    newForecastYear.value = availableYears[0]
  })

  watch(newForecastYear, (year) => {
    const planningYear = Number(year)
    if (!Number.isInteger(planningYear) || planningYear <= 0 || newForecastPeriodMode.value !== FORECAST_PERIOD_FULL_YEAR) {
      return
    }

    newForecastCoverageStartMonth.value = `${planningYear}-01-01`
    newForecastCoverageEndMonth.value = `${planningYear}-12-01`
  })

  watch(newForecastPeriodMode, (mode) => {
    if (mode !== FORECAST_PERIOD_CUSTOM_RANGE) {
      return
    }

    const planningYear = Number(newForecastYear.value)
    if (!Number.isInteger(planningYear) || planningYear <= 0) {
      return
    }

    if (!newForecastCoverageStartMonth.value) {
      newForecastCoverageStartMonth.value = `${planningYear}-01-01`
    }

    if (!newForecastCoverageEndMonth.value) {
      newForecastCoverageEndMonth.value = `${planningYear}-12-01`
    }
  })

  return {
    buildForecastMenuItems,
    buildForecastOpenHref,
    canCreateForecast,
    closeForecastCreate,
    createForecast,
    forecastCreateOpen,
    forecastCoverageMessage,
    forecastMonthOptions,
    forecastYearOptions,
    handleForecastMenuSelect,
    newForecastCoverageEndMonth,
    newForecastCoverageStartMonth,
    newForecastPeriodMode,
    newForecastSourceKind,
    newForecastYear,
    openForecast,
    openForecastCreate,
    selectForecast,
    selectedForecastId
  }
}
