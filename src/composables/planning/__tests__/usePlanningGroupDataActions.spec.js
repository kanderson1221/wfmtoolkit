import { ref } from 'vue'

import { usePlanningGroupDataActions } from '../usePlanningGroupDataActions'

const buildActualsRows = (count = 21, startDay = 1) =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(2025, 0, startDay + index, 12)
    const serviceDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-')

    return {
      serviceDate,
      contacts: 900 + index,
      ahtSeconds: 280 + (index % 10)
    }
  })

const createCenterRef = () =>
  ref({
    id: 'center-1',
    operatingWeekdays: [1, 2, 3, 4, 5],
    holidayProfiles: []
  })

const createGroupRef = (dailyRows = buildActualsRows()) =>
  ref({
    id: 'group-1',
    name: 'Voice Support',
    operatingWeekdays: [1, 2, 3, 4, 5],
    actuals: {
      sourceMode: 'daily_upload',
      dailyRows
    }
  })

describe('usePlanningGroupDataActions', () => {
  it('derives delete actions from the current selection and routes selected-scope deletes through confirmation', () => {
    const actualsViewRef = ref({
      clearSelection: vi.fn(),
      deleteSelectedScope: vi.fn(),
      clearAllData: vi.fn(),
      openImportModal: vi.fn()
    })
    const requestConfirmation = vi.fn()
    const savedGroups = []
    const actions = usePlanningGroupDataActions({
      center: createCenterRef(),
      selectedGroup: createGroupRef([
        { serviceDate: '2025-12-31', contacts: 100, ahtSeconds: 290 },
        { serviceDate: '2026-01-01', contacts: 90, ahtSeconds: 280 },
        { serviceDate: '2026-01-05', contacts: 110, ahtSeconds: 300 }
      ]),
      actualsViewRef,
      requestConfirmation,
      onSaveGroup: (group) => savedGroups.push(group)
    })

    actions.handleActualsSelectionChange({ type: 'year', label: '2026' })

    expect(actions.actualsMenuItems.value.map((item) => item.label)).toEqual([
      'Delete 2026',
      'Delete All Data'
    ])

    actions.handleActualsMenuSelect(actions.actualsMenuItems.value[0])

    expect(requestConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete Data?',
        confirmLabel: 'Delete 2026'
      })
    )

    requestConfirmation.mock.calls.at(-1)[0].onConfirm()

    expect(actualsViewRef.value.deleteSelectedScope).toHaveBeenCalledTimes(1)
    expect(actions.selectedActualsScope.value).toBeNull()

    actions.saveGroupActuals({
      sourceMode: 'daily_upload',
      dailyRows: buildActualsRows(3)
    })

    expect(savedGroups.at(-1)).toMatchObject({
      id: 'group-1',
      actuals: {
        dailyRows: buildActualsRows(3)
      }
    })
  })

  it('surfaces the forecast-history requirement only when the staffing group lacks enough shared history', () => {
    const actions = usePlanningGroupDataActions({
      center: createCenterRef(),
      selectedGroup: createGroupRef(buildActualsRows(7)),
      actualsViewRef: ref({
        clearSelection: vi.fn(),
        deleteSelectedScope: vi.fn(),
        clearAllData: vi.fn(),
        openImportModal: vi.fn()
      }),
      requestConfirmation: vi.fn(),
      onSaveGroup: vi.fn()
    })

    expect(actions.canLaunchModeledForecast.value).toBe(false)
    expect(actions.showForecastHistoryRequirement()).toBe(false)
    expect(actions.forecastHistoryRequirementMessage.value).toContain('Add at least 14 daily history rows')
  })

  it('opens the import modal, clears selection, and supports a destructive clear-all path', () => {
    const actualsViewRef = ref({
      clearSelection: vi.fn(),
      deleteSelectedScope: vi.fn(),
      clearAllData: vi.fn(),
      openImportModal: vi.fn()
    })
    const requestConfirmation = vi.fn()
    const actions = usePlanningGroupDataActions({
      center: createCenterRef(),
      selectedGroup: createGroupRef(),
      actualsViewRef,
      requestConfirmation,
      onSaveGroup: vi.fn()
    })

    actions.openActualsImport()
    expect(actualsViewRef.value.openImportModal).toHaveBeenCalledTimes(1)

    actions.handleActualsMenuSelect({ id: 'clear-all' })
    expect(requestConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete All Data?',
        confirmLabel: 'Delete All Data'
      })
    )

    requestConfirmation.mock.calls.at(-1)[0].onConfirm()
    expect(actualsViewRef.value.clearAllData).toHaveBeenCalledTimes(1)

    actions.handleActualsSelectionChange({ type: 'month', label: 'Jan 2025' })
    actions.clearActualsSelection()
    expect(actualsViewRef.value.clearSelection).toHaveBeenCalledTimes(1)
    expect(actions.selectedActualsScope.value).toBeNull()
  })
})
