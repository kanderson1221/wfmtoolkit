import { ref } from 'vue'

import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG, PLAN_REQUIREMENT_METHOD_WORKLOAD_RATIO } from '../../../planner/shared'
import { usePlannerIntradayErlang } from '../usePlannerIntradayErlang'

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('usePlannerIntradayErlang', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const createBaseArgs = () => ({
    requirementMethod: ref(PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG),
    planningYear: ref(2026),
    demandSource: ref({
      forecastDailySnapshot: [
        { serviceDate: '2026-01-02', monthIndex: 0, contacts: 100 }
      ],
      forecastMonthSnapshot: [
        { monthIndex: 0, monthLabel: 'Jan 2026', ahtSeconds: 300 }
      ]
    }),
    planMonths: ref([]),
    monthlyRecords: ref([
      {
        monthIndex: 0,
        occupancyPercent: 90
      }
    ]),
    operatingWeekdays: ref([1, 2, 3, 4, 5]),
    holidayCalendarId: ref('none'),
    disabledHolidayRuleIds: ref([]),
    customHolidays: ref([]),
    operatingOpenTime: ref('08:00'),
    operatingCloseTime: ref('09:00'),
    serviceLevelPercent: ref(80),
    serviceLevelThresholdSeconds: ref(20),
    intraday: ref({
      intervalLengthMinutes: 30,
      intervalRatios: [
        { startTime: '08:00', ratioPercent: 50 },
        { startTime: '08:30', ratioPercent: 50 }
      ]
    })
  })

  it('surfaces a blocker state when no applied daily forecast exists', async () => {
    const args = createBaseArgs()
    args.demandSource.value = {}
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = usePlannerIntradayErlang(args)
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.erlangStatus.value).toEqual({
      status: 'forecast_required',
      message: 'Intraday Erlang plans require an applied daily forecast.'
    })
    expect(result.monthlyOutputsByMonthIndex.value.size).toBe(0)
  })

  it('calls the planner API and stores monthly outputs when the payload is ready', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          intervalPlans: [],
          dailyPlans: [],
          monthlyPlans: [
            {
              monthIndex: 0,
              workloadHours: 8.3333,
              erlangStaffedHours: 123.4,
              weightedOccupancyPercent: 82.7,
              weightedServiceLevelPercent: 78.4,
              peakIntervalRequiredHeadcount: 7
            }
          ]
        })
      })
    )

    const result = usePlannerIntradayErlang(createBaseArgs())
    await flushPromises()

    expect(result.erlangStatus.value).toEqual({
      status: 'ready',
      message: ''
    })
    expect(result.monthlyOutputsByMonthIndex.value.get(0)).toMatchObject({
      workloadHours: 8.3333,
      erlangStaffedHours: 123.4,
      weightedOccupancyPercent: 82.7,
      weightedServiceLevelPercent: 78.4,
      peakIntervalRequiredHeadcount: 7
    })
  })

  it('stays idle outside intraday Erlang mode', async () => {
    const args = createBaseArgs()
    args.requirementMethod.value = PLAN_REQUIREMENT_METHOD_WORKLOAD_RATIO
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = usePlannerIntradayErlang(args)
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.erlangStatus.value).toEqual({
      status: 'idle',
      message: ''
    })
  })
})
