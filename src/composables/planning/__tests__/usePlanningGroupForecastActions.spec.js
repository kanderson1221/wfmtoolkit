import { computed, nextTick, ref } from 'vue'

import { usePlanningGroupForecastActions } from '../usePlanningGroupForecastActions'

const appRouteMocks = vi.hoisted(() => ({
  navigateToHash: vi.fn(),
  buildPlanningGroupForecastsHash: vi.fn(
    (centerId, groupId, planningYear, forecastId) => `#open/${centerId}/${groupId}/${planningYear}/${forecastId}`
  ),
  buildPlanningGroupNewForecastHash: vi.fn(
    (centerId, groupId, planningYear, options = {}) =>
      `#new/${centerId}/${groupId}/${planningYear}/${options.sourceKind || 'modeled_daily'}/${options.forecastType || ''}`
  )
}))

vi.mock('../../../appRoutes', () => ({
  navigateToHash: appRouteMocks.navigateToHash,
  buildPlanningGroupForecastsHash: appRouteMocks.buildPlanningGroupForecastsHash,
  buildPlanningGroupNewForecastHash: appRouteMocks.buildPlanningGroupNewForecastHash
}))

const createArgs = ({
  canLaunch = true,
  selectedYear = 2026,
  forecasts = [],
  actualRows = [],
  plans = [{ planningYear: 2026 }, { planningYear: 2027 }],
  requestConfirmation = vi.fn(),
  deleteForecast = vi.fn(),
  onMissingHistory = vi.fn()
} = {}) => ({
  center: ref({ id: 'center-1' }),
  selectedGroup: ref({
    id: 'group-1',
    name: 'Voice Support',
    actuals: {
      sourceMode: 'daily_upload',
      dailyRows: actualRows
    },
    plans
  }),
  selectedYearModel: ref(selectedYear),
  forecastRows: ref(forecasts),
  canLaunchModeledForecast: computed(() => canLaunch),
  requestConfirmation,
  deleteForecast,
  onMissingHistory
})

describe('usePlanningGroupForecastActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens a source-aware create flow and routes modeled forecasts through the planning hash builder', () => {
    const actions = usePlanningGroupForecastActions(createArgs())

    actions.openForecastCreate()

    expect(actions.forecastCreateOpen.value).toBe(true)
    expect(actions.newForecastYear.value).toBe(2026)
    expect(actions.newForecastSourceKind.value).toBe('modeled_daily')
    expect(actions.forecastYearOptions.value.map((option) => option.value)).toEqual(
      expect.arrayContaining([2027, 2026])
    )
    expect(actions.canCreateForecast.value).toBe(true)

    actions.createForecast()

    expect(appRouteMocks.buildPlanningGroupNewForecastHash).toHaveBeenCalledWith(
      'center-1',
      'group-1',
      2026,
      {
        sourceKind: 'modeled_daily',
        forecastType: 'budget',
        coverageStartDate: '2026-01-01',
        coverageEndDate: '2026-12-31'
      }
    )
    expect(appRouteMocks.navigateToHash).toHaveBeenCalledWith('#new/center-1/group-1/2026/modeled_daily/budget')
  })

  it('blocks modeled creation when shared history is missing but still allows imported forecast creation', () => {
    const onMissingHistory = vi.fn()
    const actions = usePlanningGroupForecastActions(
      createArgs({
        canLaunch: false,
        onMissingHistory
      })
    )

    actions.openForecastCreate()

    expect(actions.forecastCreateOpen.value).toBe(true)
    expect(actions.canCreateForecast.value).toBe(false)
    actions.createForecast()
    expect(onMissingHistory).toHaveBeenCalledTimes(1)
    expect(appRouteMocks.navigateToHash).not.toHaveBeenCalled()

    actions.newForecastSourceKind.value = 'imported_daily'
    expect(actions.canCreateForecast.value).toBe(true)
    actions.createForecast()

    expect(appRouteMocks.buildPlanningGroupNewForecastHash).toHaveBeenCalledWith(
      'center-1',
      'group-1',
      2026,
      {
        sourceKind: 'imported_daily',
        forecastType: 'budget',
        coverageStartDate: '2026-01-01',
        coverageEndDate: '2026-12-31'
      }
    )
    expect(appRouteMocks.navigateToHash).toHaveBeenCalledWith('#new/center-1/group-1/2026/imported_daily/budget')
  })

  it('supports future full-year forecast options and custom month coverage', () => {
    const actions = usePlanningGroupForecastActions(createArgs({
      selectedYear: 2027,
      forecasts: [
        {
          id: 'forecast-1',
          planningYear: 2026,
          coverageStartDate: '2028-10-01',
          coverageEndDate: '2029-03-31'
        }
      ]
    }))

    actions.openForecastCreate()

    expect(actions.forecastYearOptions.value.map((option) => option.value)).toEqual(
      expect.arrayContaining([2026, 2027, 2028, 2029])
    )
    expect(actions.newForecastPeriodMode.value).toBe('full_year')

    actions.newForecastPeriodMode.value = 'custom_range'
    actions.newForecastCoverageStartMonth.value = '2027-10-01'
    actions.newForecastCoverageEndMonth.value = '2028-03-01'
    expect(actions.forecastCoverageMessage.value).toBe('')

    actions.createForecast()

    expect(appRouteMocks.buildPlanningGroupNewForecastHash).toHaveBeenCalledWith(
      'center-1',
      'group-1',
      2027,
      {
        sourceKind: 'modeled_daily',
        forecastType: 'budget',
        coverageStartDate: '2027-10-01',
        coverageEndDate: '2028-03-31'
      }
    )
  })

  it('offers modeled forecast years from loaded history instead of only the selected future plan year', () => {
    const actions = usePlanningGroupForecastActions(createArgs({
      selectedYear: 2026,
      actualRows: [
        { serviceDate: '2024-04-29', contacts: 1000, ahtSeconds: 360 },
        { serviceDate: '2024-04-30', contacts: 1100, ahtSeconds: 365 }
      ]
    }))

    actions.openForecastCreate()

    expect(actions.forecastYearOptions.value.map((option) => option.value)).toEqual([2025, 2024])
    expect(actions.newForecastYear.value).toBe(2025)
    expect(actions.newForecastCoverageStartMonth.value).toBe('2025-01-01')
    expect(actions.newForecastCoverageEndMonth.value).toBe('2025-12-01')
  })

  it('selects the first forecast, opens saved forecasts, and routes deletes through confirmation', async () => {
    const requestConfirmation = vi.fn()
    const deleteForecast = vi.fn()
    const forecast = {
      id: 'forecast-1',
      name: 'Voice Support 2027 Forecast',
      planningYear: 2027
    }
    const actions = usePlanningGroupForecastActions(
      createArgs({
        forecasts: [forecast],
        requestConfirmation,
        deleteForecast
      })
    )

    await nextTick()

    expect(actions.selectedForecastId.value).toBe('forecast-1')

    actions.openForecast(forecast)
    expect(appRouteMocks.buildPlanningGroupForecastsHash).toHaveBeenCalledWith('center-1', 'group-1', 2027, 'forecast-1')
    expect(appRouteMocks.navigateToHash).toHaveBeenCalledWith('#open/center-1/group-1/2027/forecast-1')

    actions.handleForecastMenuSelect(forecast, { id: 'delete-forecast' })
    expect(requestConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete Forecast?',
        description: expect.stringContaining('No saved plans use this forecast.'),
        confirmLabel: 'Delete Forecast'
      })
    )

    requestConfirmation.mock.calls.at(-1)[0].onConfirm()
    expect(deleteForecast).toHaveBeenCalledWith(forecast)
  })

  it('identifies dependent plan names and states before deleting a referenced forecast', () => {
    const requestConfirmation = vi.fn()
    const forecast = {
      id: 'forecast-1',
      name: 'Voice Support 2027 Forecast',
      planningYear: 2027
    }
    const actions = usePlanningGroupForecastActions(
      createArgs({
        forecasts: [forecast],
        requestConfirmation,
        plans: [
          {
            id: 'budget-2027',
            name: '2027 Budget',
            planType: 'budget',
            status: 'draft',
            planningYear: 2027,
            demandSource: {
              mode: 'forecast',
              forecastProjectId: 'forecast-1'
            }
          },
          {
            id: 'update-2027',
            name: 'Summer Update',
            planType: 'update',
            planningYear: 2027,
            demandSource: {
              mode: 'forecast',
              forecastProjectId: 'forecast-1'
            }
          },
          {
            id: 'other-budget',
            name: 'Other Budget',
            planType: 'budget',
            status: 'finalized',
            planningYear: 2028,
            demandSource: {
              mode: 'forecast',
              forecastProjectId: 'forecast-2'
            }
          }
        ]
      })
    )

    actions.handleForecastMenuSelect(forecast, { id: 'delete-forecast' })

    expect(requestConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringMatching(
          /used by 2 saved plans: 2027 Budget \(draft\); Summer Update \(finalized\).*does not delete these plans or change their saved demand values and snapshots/
        )
      })
    )
  })
})
