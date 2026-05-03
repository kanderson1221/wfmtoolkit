import { computed, ref, watch } from 'vue'

import { createPlanningGroupActuals, resolvePlanningGroupActuals } from '../../planner/groupActuals'
import {
  buildForecastTrainingSeedFromPlanningGroupActuals,
  MINIMUM_FORECAST_HISTORY_DAYS
} from '../../planner/groupActualsForecastSeed'

export function usePlanningGroupDataActions({
  center,
  selectedGroup,
  actualsViewRef,
  requestConfirmation,
  onSaveGroup
}) {
  const selectedActualsScope = ref(null)
  const forecastHistoryRequirementMessage = ref('')

  const saveGroupActuals = (actuals) => {
    if (!selectedGroup.value) {
      return
    }

    onSaveGroup?.({
      ...selectedGroup.value,
      actuals: createPlanningGroupActuals(actuals)
    })
  }

  const handleActualsSelectionChange = (selection) => {
    selectedActualsScope.value = selection ? { ...selection } : null
  }

  const clearActualsSelection = () => {
    selectedActualsScope.value = null
    actualsViewRef.value?.clearSelection?.()
  }

  const hasActualsData = computed(() =>
    resolvePlanningGroupActuals(selectedGroup.value).dailyRows.length > 0
  )

  const selectedGroupForecastTrainingSeed = computed(() =>
    buildForecastTrainingSeedFromPlanningGroupActuals(resolvePlanningGroupActuals(selectedGroup.value), {
      group: selectedGroup.value,
      center: center.value
    })
  )

  const canLaunchModeledForecast = computed(() =>
    selectedGroupForecastTrainingSeed.value.historyRows.length >= MINIMUM_FORECAST_HISTORY_DAYS
  )

  const actualsMenuItems = computed(() => {
    if (!hasActualsData.value) {
      return []
    }

    const items = []

    if (selectedActualsScope.value?.type === 'year' || selectedActualsScope.value?.type === 'month') {
      items.push({
        id: 'delete-selected',
        label: `Delete ${selectedActualsScope.value.label}`,
        tone: 'danger'
      })
    }

    items.push({
      id: 'clear-all',
      label: 'Delete All Data',
      tone: 'danger'
    })

    return items
  })

  const openActualsImport = () => {
    actualsViewRef.value?.openImportModal?.()
  }

  const showForecastHistoryRequirement = () => {
    if (!selectedGroup.value || canLaunchModeledForecast.value) {
      forecastHistoryRequirementMessage.value = ''
      return true
    }

    forecastHistoryRequirementMessage.value = `Add at least ${MINIMUM_FORECAST_HISTORY_DAYS} daily history rows in Data before building a forecast.`
    return false
  }

  const confirmDeleteActualsSelection = () => {
    if (!selectedGroup.value || !selectedActualsScope.value) {
      return
    }

    const scopeLabel = selectedActualsScope.value.label
    const scopeDescription =
      selectedActualsScope.value.type === 'year'
        ? `Delete all loaded data for ${scopeLabel}? This removes every stored day in that year.`
        : `Delete all loaded data for ${scopeLabel}? This removes every stored day in that month.`

    requestConfirmation({
      title: 'Delete Data?',
      description: `${scopeDescription} This cannot be undone.`,
      confirmLabel: `Delete ${scopeLabel}`,
      onConfirm: () => {
        actualsViewRef.value?.deleteSelectedScope?.()
        selectedActualsScope.value = null
      }
    })
  }

  const confirmClearAllActuals = () => {
    if (!selectedGroup.value) {
      return
    }

    requestConfirmation({
      title: 'Delete All Data?',
      description: `Delete all loaded actuals for ${selectedGroup.value.name}? This removes the shared history used by forecasting and staffing. This cannot be undone.`,
      confirmLabel: 'Delete All Data',
      onConfirm: () => {
        actualsViewRef.value?.clearAllData?.()
        selectedActualsScope.value = null
      }
    })
  }

  const handleActualsMenuSelect = (item) => {
    if (!item) {
      return
    }

    if (item.id === 'delete-selected') {
      confirmDeleteActualsSelection()
      return
    }

    if (item.id === 'clear-all') {
      confirmClearAllActuals()
    }
  }

  watch(
    [selectedGroup, canLaunchModeledForecast],
    ([group]) => {
      if (!group || canLaunchModeledForecast.value) {
        forecastHistoryRequirementMessage.value = ''
      }
    },
    { immediate: true }
  )

  return {
    actualsMenuItems,
    canLaunchModeledForecast,
    clearActualsSelection,
    forecastHistoryRequirementMessage,
    handleActualsMenuSelect,
    handleActualsSelectionChange,
    minimumForecastHistoryDays: MINIMUM_FORECAST_HISTORY_DAYS,
    openActualsImport,
    saveGroupActuals,
    selectedActualsScope,
    showForecastHistoryRequirement
  }
}
