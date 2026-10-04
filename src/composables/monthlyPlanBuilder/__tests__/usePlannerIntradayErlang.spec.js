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
      minimumHeadcount: 2,
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
    expect(result.erlangStatus.value).toMatchObject({
      status: 'forecast_required',
      message: 'Intraday Erlang plans require an applied daily forecast.',
      canRun: false,
      hasResults: false
    })
    expect(result.monthlyOutputsByMonthIndex.value.size).toBe(0)
  })

  it('waits for an explicit run before calling the planner API', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intervalPlans: [
          {
            monthIndex: 0,
            serviceDate: '2026-01-02',
            intervalStart: '2026-01-02T08:00:00',
            intervalLengthMinutes: 30,
            requiredStaffNet: 13,
            serviceLevel: 0.83,
            occupancy: 0.72
          }
        ],
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
    vi.stubGlobal(
      'fetch',
      fetchSpy
    )

    const result = usePlannerIntradayErlang(createBaseArgs())
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.erlangStatus.value).toMatchObject({
      status: 'ready_to_run',
      message: 'Run staffing calculations to populate monthly Erlang staffing outputs.',
      canRun: true,
      hasResults: false
    })

    await result.runErlangCalculations()
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result.erlangStatus.value).toMatchObject({
      status: 'ready',
      message: '',
      canRun: true,
      hasResults: true
    })
    expect(result.monthlyOutputsByMonthIndex.value.get(0)).toMatchObject({
      workloadHours: 8.3333,
      erlangStaffedHours: 123.4,
      weightedOccupancyPercent: 82.7,
      weightedServiceLevelPercent: 78.4,
      peakIntervalRequiredHeadcount: 7
    })
    expect(result.intervalOutputs.value[0]).toMatchObject({
      callsOffered: 50,
      averageHandleTimeSeconds: 300,
      workloadHours: 4.166667,
      requiredStaffNet: 13,
      laborHoursNet: 6.5
    })
  })

  it('marks stored outputs stale when Erlang-driving inputs change', async () => {
    const storedResults = ref(null)
    const args = createBaseArgs()
    args.storedResults = storedResults

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          intervalPlans: [
            {
              monthIndex: 0,
              serviceDate: '2026-01-02',
              intervalStart: '2026-01-02T08:00:00',
              intervalLengthMinutes: 30,
              requiredStaffNet: 13
            }
          ],
          dailyPlans: [],
          monthlyPlans: [
            {
              monthIndex: 0,
              erlangStaffedHours: 123.4
            }
          ]
        })
      })
    )

    const result = usePlannerIntradayErlang(args)
    await result.runErlangCalculations()
    await flushPromises()

    expect(result.erlangStatus.value).toMatchObject({
      status: 'ready',
      hasResults: true
    })
    expect(storedResults.value).toMatchObject({
      version: 2,
      rowCount: 2,
      monthCount: 1
    })

    args.serviceLevelPercent.value = 85
    await flushPromises()

    expect(result.erlangStatus.value).toMatchObject({
      status: 'stale',
      canRun: true,
      hasResults: true,
      message: 'Plan inputs changed after the last staffing calculation. Rerun staffing calculations to refresh the Erlang outputs.'
    })
    expect(result.monthlyOutputsByMonthIndex.value.get(0)).toMatchObject({
      erlangStaffedHours: 123.4
    })

    args.serviceLevelPercent.value = 80
    args.intraday.value.minimumHeadcount = 4
    await flushPromises()

    expect(result.erlangStatus.value).toMatchObject({
      status: 'stale',
      canRun: true,
      hasResults: true
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
    expect(result.erlangStatus.value).toMatchObject({
      status: 'idle',
      message: '',
      canRun: false
    })
  })
})
