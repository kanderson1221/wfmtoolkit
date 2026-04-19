import { computed, nextTick, ref } from 'vue'

import { usePlanningGroupForecastActions } from '../usePlanningGroupForecastActions'

const appRouteMocks = vi.hoisted(() => ({
  navigateToHash: vi.fn(),
  buildPlanningGroupForecastsHash: vi.fn(
    (centerId, groupId, planningYear, forecastId) => `#open/${centerId}/${groupId}/${planningYear}/${forecastId}`
  ),
  buildPlanningGroupNewForecastHash: vi.fn(
    (centerId, groupId, planningYear, options = {}) =>
      `#new/${centerId}/${groupId}/${planningYear}/${options.forecastType || ''}`
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
  requestConfirmation = vi.fn(),
  deleteForecast = vi.fn(),
  onMissingHistory = vi.fn()
} = {}) => ({
  center: ref({ id: 'center-1' }),
  selectedGroup: ref({
    id: 'group-1',
    name: 'Voice Support',
    plans: [{ planningYear: 2026 }, { planningYear: 2027 }]
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

  it('opens a year-only create flow and routes new forecasts through the planning hash builder', () => {
    const actions = usePlanningGroupForecastActions(createArgs())

    actions.openForecastCreate()

    expect(actions.forecastCreateOpen.value).toBe(true)
    expect(actions.newForecastYear.value).toBe(2026)
    expect(actions.forecastYearOptions.value.map((option) => option.value)).toEqual(
      expect.arrayContaining([2027, 2026])
    )
    expect(actions.canCreateForecast.value).toBe(true)

    actions.createForecast()

    expect(appRouteMocks.buildPlanningGroupNewForecastHash).toHaveBeenCalledWith(
      'center-1',
      'group-1',
      2026,
      { forecastType: 'budget' }
    )
    expect(appRouteMocks.navigateToHash).toHaveBeenCalledWith('#new/center-1/group-1/2026/budget')
  })

  it('blocks create-flow entry when shared history is missing and notifies the caller', () => {
    const onMissingHistory = vi.fn()
    const actions = usePlanningGroupForecastActions(
      createArgs({
        canLaunch: false,
        onMissingHistory
      })
    )

    actions.openForecastCreate()

    expect(actions.forecastCreateOpen.value).toBe(false)
    expect(onMissingHistory).toHaveBeenCalledTimes(1)
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
        confirmLabel: 'Delete Forecast'
      })
    )

    requestConfirmation.mock.calls.at(-1)[0].onConfirm()
    expect(deleteForecast).toHaveBeenCalledWith(forecast)
  })
})
