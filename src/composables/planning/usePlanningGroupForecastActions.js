import { computed, ref, watch } from 'vue'

import {
  buildPlanningGroupForecastsHash,
  buildPlanningGroupNewForecastHash,
  navigateToHash
} from '../../appRoutes'
import { FORECAST_TYPE_BUDGET } from '../../forecasting/shared'
import { currentYear, yearOptions } from '../monthlyPlanBuilder/shared'

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
  const selectedForecastId = ref('')

  const forecastYearOptions = computed(() => {
    const yearSet = new Set(yearOptions.map((year) => Number(year)))

    if (Number(selectedYearModel.value) > 0) {
      yearSet.add(Number(selectedYearModel.value))
    }

    ;(selectedGroup.value?.plans || []).forEach((plan) => {
      const planningYear = Number(plan?.planningYear)
      if (planningYear > 0) {
        yearSet.add(planningYear)
      }
    })

    return [...yearSet]
      .filter((year) => Number.isInteger(year) && year > 0)
      .sort((left, right) => right - left)
      .map((year) => ({
        label: String(year),
        value: year
      }))
  })

  const openForecastCreate = () => {
    if (!selectedGroup.value) {
      return
    }

    if (!canLaunchModeledForecast.value) {
      selectedForecastId.value = ''
      forecastCreateOpen.value = false
      onMissingHistory?.()
      return
    }

    newForecastYear.value = Number(selectedYearModel.value) > 0 ? Number(selectedYearModel.value) : currentYear
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
    const planningYear = Number(newForecastYear.value)

    if (!selectedGroup.value || !Number.isInteger(planningYear) || planningYear <= 0) {
      return false
    }

    return canLaunchModeledForecast.value
  })

  const createForecast = () => {
    if (!selectedGroup.value || !canCreateForecast.value) {
      return
    }

    const planningYear = Number(newForecastYear.value)

    forecastCreateOpen.value = false
    selectedForecastId.value = ''
    navigateToHash(
      buildPlanningGroupNewForecastHash(center.value.id, selectedGroup.value.id, planningYear, {
        forecastType: FORECAST_TYPE_BUDGET
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
    requestConfirmation({
      title: 'Delete Forecast?',
      description: `Delete the saved forecast "${forecast.name}" from ${selectedGroup.value?.name || 'this staffing group'}?`,
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

  return {
    buildForecastMenuItems,
    buildForecastOpenHref,
    canCreateForecast,
    closeForecastCreate,
    createForecast,
    forecastCreateOpen,
    forecastYearOptions,
    handleForecastMenuSelect,
    newForecastYear,
    openForecast,
    openForecastCreate,
    selectForecast,
    selectedForecastId
  }
}
