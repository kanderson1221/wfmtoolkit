import { describe, expect, it } from 'vitest'

import {
  buildActualsThroughMonthOptions,
  buildPlanUpdateActualsState,
  createUpdatedPlanDraft
} from '../planUpdates'
import { PLAN_TYPE_UPDATE } from '../../planningStorage'

const buildPlanMonths = () =>
  Array.from({ length: 12 }, (_, monthIndex) => ({
    contacts: 1000 + (monthIndex * 100),
    ahtSeconds: 300 + monthIndex
  }))

const buildCompleteWeekdayActuals = (year, monthIndex, overridesByDate = {}) => {
  const rows = []
  const lastDay = new Date(year, monthIndex + 1, 0, 12).getDate()

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, monthIndex, day, 12)
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue
    }

    const serviceDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    rows.push({
      serviceDate,
      contacts: 0,
      ahtSeconds: 0,
      ...overridesByDate[serviceDate]
    })
  }

  return rows
}

describe('planUpdates', () => {
  it('builds actuals-through options from loaded daily actuals', () => {
    const options = buildActualsThroughMonthOptions({
      dailyRows: [
        ...buildCompleteWeekdayActuals(2026, 0, {
          '2026-01-02': { contacts: 100, ahtSeconds: 300 }
        }),
        ...buildCompleteWeekdayActuals(2026, 1, {
          '2026-02-03': { contacts: 120, ahtSeconds: 330 }
        }),
        { serviceDate: '2027-01-02', contacts: 200, ahtSeconds: 310 }
      ]
    }, 2026)

    expect(options).toEqual([
      {
        label: 'Actuals through Jan 2026',
        value: '2026-01-01',
        monthIndex: 0
      },
      {
        label: 'Actuals through Feb 2026',
        value: '2026-02-01',
        monthIndex: 1
      }
    ])
  })

  it('blocks a cutoff when an expected open date is missing from actuals', () => {
    const actuals = {
      dailyRows: [
        { serviceDate: '2026-01-02', contacts: 100, ahtSeconds: 300 }
      ]
    }
    const state = buildPlanUpdateActualsState(actuals, 2026)

    expect(state.options).toEqual([])
    expect(state.blocker).toBe(
      'Jan 2026 actuals are missing 21 expected open days, starting with Jan 1, 2026. ' +
      'Import daily actuals for every open date before creating an updated plan through Jan or later. ' +
      'Configured closed dates are excluded.'
    )
    expect(() => createUpdatedPlanDraft({
      sourcePlan: {
        id: 'source-plan',
        planningYear: 2026,
        planMonths: buildPlanMonths()
      },
      actuals,
      actualsThroughMonth: '2026-01-01'
    })).toThrow(state.blocker)
  })

  it('excludes configured closed dates from cutoff completeness', () => {
    const dailyRows = buildCompleteWeekdayActuals(2026, 0, {
      '2026-01-02': { contacts: 100, ahtSeconds: 300 }
    }).filter((row) => row.serviceDate !== '2026-01-01')
    const state = buildPlanUpdateActualsState(
      { dailyRows },
      2026,
      {
        group: { holidayCalendarId: 'inherit' },
        center: {
          operatingWeekdays: [1, 2, 3, 4, 5],
          holidayProfiles: [
            {
              year: 2026,
              holidayCalendarId: 'none',
              customHolidays: [
                { id: 'new-year-closure', label: 'New Year Closure', date: '2026-01-01' }
              ]
            }
          ]
        }
      }
    )

    expect(state.blocker).toBe('')
    expect(state.options).toHaveLength(1)
    expect(state.options[0].value).toBe('2026-01-01')
  })

  it('blocks cutoffs at or after positive-contact actuals with zero weighted AHT', () => {
    const actuals = {
      dailyRows: [
        ...buildCompleteWeekdayActuals(2026, 0, {
          '2026-01-02': { contacts: 100, ahtSeconds: 300 }
        }),
        ...buildCompleteWeekdayActuals(2026, 1, {
          '2026-02-03': { contacts: 120, ahtSeconds: 0 }
        }),
        ...buildCompleteWeekdayActuals(2026, 2, {
          '2026-03-02': { contacts: 140, ahtSeconds: 330 }
        })
      ]
    }
    const state = buildPlanUpdateActualsState(actuals, 2026)

    expect(state.options).toEqual([
      {
        label: 'Actuals through Jan 2026',
        value: '2026-01-01',
        monthIndex: 0
      }
    ])
    expect(state.blocker).toBe(
      'Feb 2026 actuals have positive contacts but zero weighted AHT. ' +
      'Import corrected daily actuals with positive AHT before creating an updated plan through Feb or later.'
    )

    expect(() => createUpdatedPlanDraft({
      sourcePlan: {
        id: 'source-plan',
        planningYear: 2026,
        planMonths: buildPlanMonths()
      },
      actuals,
      actualsThroughMonth: '2026-03-01'
    })).toThrow(state.blocker)
  })

  it('allows zero AHT when the actualized month has no contacts', () => {
    const actuals = {
      dailyRows: buildCompleteWeekdayActuals(2026, 0)
    }

    expect(buildPlanUpdateActualsState(actuals, 2026)).toMatchObject({
      blocker: '',
      options: [
        {
          value: '2026-01-01'
        }
      ]
    })
    expect(() => createUpdatedPlanDraft({
      sourcePlan: {
        id: 'source-plan',
        planningYear: 2026,
        planMonths: buildPlanMonths()
      },
      actuals,
      actualsThroughMonth: '2026-01-01',
      decisionReason: 'Actualize a closed zero-volume month'
    })).not.toThrow()
  })

  it('creates an update draft that actualizes closed months and keeps future forecast demand', () => {
    const sourcePlan = {
      id: 'source-plan',
      name: '2026 Budget',
      planningYear: 2026,
      requirementMethod: 'intraday_erlang',
      budgetPlanId: 'budget-plan',
      planMonths: buildPlanMonths(),
      demandSource: {
        mode: 'forecast',
        forecastProjectId: 'forecast-1',
        forecastProjectName: 'Budget Forecast',
        forecastMonthSnapshot: Array.from({ length: 12 }, (_, monthIndex) => ({
          monthIndex,
          monthLabel: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2026, monthIndex, 1)),
          monthStart: `2026-${String(monthIndex + 1).padStart(2, '0')}-01`,
          contacts: 2000 + (monthIndex * 100),
          ahtSeconds: 360,
          averageDailyVolume: 100,
          peakDailyVolume: 120
        })),
        forecastDailySnapshot: [
          { serviceDate: '2026-01-02', monthIndex: 0, monthLabel: 'Jan', contacts: 80 },
          { serviceDate: '2026-02-02', monthIndex: 1, monthLabel: 'Feb', contacts: 90 },
          { serviceDate: '2026-03-02', monthIndex: 2, monthLabel: 'Mar', contacts: 110 }
        ]
      }
    }
    const actuals = {
      dailyRows: [
        ...buildCompleteWeekdayActuals(2026, 0, {
          '2026-01-02': { contacts: 150, ahtSeconds: 300 },
          '2026-01-05': { contacts: 250, ahtSeconds: 360 }
        }),
        ...buildCompleteWeekdayActuals(2026, 1, {
          '2026-02-02': { contacts: 300, ahtSeconds: 420 }
        })
      ]
    }

    const updateDraft = createUpdatedPlanDraft({
      sourcePlan,
      budgetPlan: { id: 'budget-plan', name: '2026 Budget' },
      actuals,
      actualsThroughMonth: '2026-02-01',
      name: '2026 Mar Update',
      decisionReason: 'Approved February reforecast',
      timestamp: '2026-03-01T12:00:00.000Z'
    })

    expect(updateDraft).toMatchObject({
      id: null,
      name: '2026 Mar Update',
      planType: PLAN_TYPE_UPDATE,
      isCurrent: true,
      sourcePlanId: 'source-plan',
      budgetPlanId: 'budget-plan',
      actualsThroughMonth: '2026-02-01',
      decisionReason: 'Approved February reforecast',
      actualizedAt: '2026-03-01T12:00:00.000Z'
    })
    expect(updateDraft.planMonths[0]).toMatchObject({
      contacts: 400,
      ahtSeconds: 337.5
    })
    expect(updateDraft.planMonths[1]).toMatchObject({
      contacts: 300,
      ahtSeconds: 420
    })
    expect(updateDraft.planMonths[2]).toMatchObject({
      contacts: 1200,
      ahtSeconds: 302
    })
    expect(updateDraft.demandSource.forecastMonthSnapshot[0]).toMatchObject({
      monthIndex: 0,
      contacts: 400,
      ahtSeconds: 337.5,
      averageDailyVolume: 400 / 22,
      peakDailyVolume: 250
    })
    expect(updateDraft.demandSource.forecastDailySnapshot).toHaveLength(43)
    expect(updateDraft.demandSource.forecastDailySnapshot[0].serviceDate).toBe('2026-01-01')
    expect(updateDraft.demandSource.forecastDailySnapshot.find((row) => row.serviceDate === '2026-03-02')).toMatchObject({
      contacts: 110
    })
  })

  it('requires a bounded decision reason for a new update', () => {
    const actuals = {
      dailyRows: buildCompleteWeekdayActuals(2026, 0, {
        '2026-01-02': { contacts: 150, ahtSeconds: 300 }
      })
    }
    const input = {
      sourcePlan: {
        id: 'source-plan',
        planningYear: 2026,
        planMonths: buildPlanMonths()
      },
      actuals,
      actualsThroughMonth: '2026-01-01'
    }

    expect(() => createUpdatedPlanDraft(input)).toThrow(
      'Enter a decision reason before creating an updated plan.'
    )
    expect(() => createUpdatedPlanDraft({
      ...input,
      decisionReason: 'x'.repeat(241)
    })).toThrow('Keep the updated-plan decision reason to 240 characters or fewer.')
  })
})
