import { ref } from 'vue'

import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../../planner/shared'
import {
  buildPlannerActualsIntradayErlangPayload,
  buildPlannerIntradayErlangInputSignature
} from '../../../planner/intradayErlang'
import { usePlannerActualsIntradayErlang } from '../usePlannerActualsIntradayErlang'

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('usePlannerActualsIntradayErlang', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const createBaseArgs = () => ({
    requirementMethod: ref(PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG),
    planningYear: ref(2026),
    actualDailyRows: ref([
      { serviceDate: '2026-01-05', contacts: 100, ahtSeconds: 300 }
    ]),
    monthlyRecords: ref([
      {
        monthIndex: 0,
        occupancyPercent: 90,
        ahtSeconds: 300
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
    }),
    storedResults: ref(null)
  })

  it('waits for an explicit run before calculating actual Intraday Erlang requirements', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
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
    vi.stubGlobal('fetch', fetchSpy)

    const result = usePlannerActualsIntradayErlang(createBaseArgs())
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.actualsErlangStatus.value).toMatchObject({
      status: 'ready_to_run',
      message: 'Run actual staffing calculations to populate actual Intraday Erlang requirements.',
      canRun: true,
      isRunning: false,
      hasResults: false
    })
    expect(result.monthlyOutputsByMonthIndex.value.size).toBe(0)

    await result.runActualsErlangCalculations()
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result.actualsErlangStatus.value).toMatchObject({
      status: 'ready',
      message: '',
      canRun: true,
      isRunning: false,
      hasResults: true
    })
    expect(result.monthlyOutputsByMonthIndex.value.get(0)).toMatchObject({
      workloadHours: 8.3333,
      erlangStaffedHours: 123.4,
      weightedOccupancyPercent: 82.7,
      weightedServiceLevelPercent: 78.4,
      peakIntervalRequiredHeadcount: 7
    })
  })

  it('hydrates matching saved actual results without another API run', async () => {
    const args = createBaseArgs()
    const payloadState = buildPlannerActualsIntradayErlangPayload({
      planningYear: args.planningYear.value,
      actualDailyRows: args.actualDailyRows.value,
      monthlyRecords: args.monthlyRecords.value,
      operatingWeekdays: args.operatingWeekdays.value,
      holidayCalendarId: args.holidayCalendarId.value,
      disabledHolidayRuleIds: args.disabledHolidayRuleIds.value,
      customHolidays: args.customHolidays.value,
      operatingOpenTime: args.operatingOpenTime.value,
      operatingCloseTime: args.operatingCloseTime.value,
      serviceLevelPercent: args.serviceLevelPercent.value,
      serviceLevelThresholdSeconds: args.serviceLevelThresholdSeconds.value,
      intraday: args.intraday.value
    })
    args.storedResults.value = {
      version: 1,
      calculatedAt: '2026-01-15T12:00:00.000Z',
      inputSignature: buildPlannerIntradayErlangInputSignature(payloadState.rows),
      rowCount: payloadState.rows.length,
      monthCount: 1,
      monthlyOutputs: [{ monthIndex: 0, erlangStaffedHours: 123.4 }],
      intervalOutputs: [],
      dailyOutputs: []
    }
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = usePlannerActualsIntradayErlang(args)
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.actualsErlangStatus.value).toMatchObject({
      status: 'ready',
      hasResults: true
    })
    expect(result.monthlyOutputsByMonthIndex.value.get(0)).toMatchObject({
      erlangStaffedHours: 123.4
    })
  })

  it('marks actual Erlang outputs stale when actuals change after a run', async () => {
    const args = createBaseArgs()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          monthlyPlans: [
            {
              monthIndex: 0,
              erlangStaffedHours: 123.4
            }
          ]
        })
      })
    )

    const result = usePlannerActualsIntradayErlang(args)
    await flushPromises()
    await result.runActualsErlangCalculations()
    await flushPromises()

    args.actualDailyRows.value = [
      { serviceDate: '2026-01-05', contacts: 150, ahtSeconds: 300 }
    ]
    await flushPromises()

    expect(result.actualsErlangStatus.value).toMatchObject({
      status: 'stale',
      canRun: true,
      isStale: true,
      hasResults: true
    })
    expect(result.actualsErlangStatus.value.message).toContain('Rerun actual staffing calculations')
    expect(result.monthlyOutputsByMonthIndex.value.size).toBe(0)
  })

  it('preserves saved evidence when an explicit rerun fails', async () => {
    const args = createBaseArgs()
    const payloadState = buildPlannerActualsIntradayErlangPayload({
      planningYear: args.planningYear.value,
      actualDailyRows: args.actualDailyRows.value,
      monthlyRecords: args.monthlyRecords.value,
      operatingWeekdays: args.operatingWeekdays.value,
      holidayCalendarId: args.holidayCalendarId.value,
      disabledHolidayRuleIds: args.disabledHolidayRuleIds.value,
      customHolidays: args.customHolidays.value,
      operatingOpenTime: args.operatingOpenTime.value,
      operatingCloseTime: args.operatingCloseTime.value,
      serviceLevelPercent: args.serviceLevelPercent.value,
      serviceLevelThresholdSeconds: args.serviceLevelThresholdSeconds.value,
      intraday: args.intraday.value
    })
    args.storedResults.value = {
      version: 1,
      inputSignature: buildPlannerIntradayErlangInputSignature(payloadState.rows),
      rowCount: payloadState.rows.length,
      monthCount: 1,
      monthlyOutputs: [{ monthIndex: 0, erlangStaffedHours: 123.4 }],
      intervalOutputs: [],
      dailyOutputs: []
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => ''
    }))

    const result = usePlannerActualsIntradayErlang(args)
    await flushPromises()
    await result.runActualsErlangCalculations()
    await flushPromises()

    expect(result.actualsErlangStatus.value).toMatchObject({
      status: 'error',
      hasResults: true
    })
    expect(args.storedResults.value.monthlyOutputs[0]).toMatchObject({
      erlangStaffedHours: 123.4
    })
    expect(result.monthlyOutputsByMonthIndex.value.size).toBe(0)
  })
})
