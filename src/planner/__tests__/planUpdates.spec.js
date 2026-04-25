import { describe, expect, it } from 'vitest'

import { createUpdatedPlanDraft, buildActualsThroughMonthOptions } from '../planUpdates'
import { PLAN_TYPE_UPDATE } from '../../planningStorage'

const buildPlanMonths = () =>
  Array.from({ length: 12 }, (_, monthIndex) => ({
    contacts: 1000 + (monthIndex * 100),
    ahtSeconds: 300 + monthIndex
  }))

describe('planUpdates', () => {
  it('builds actuals-through options from loaded daily actuals', () => {
    const options = buildActualsThroughMonthOptions({
      dailyRows: [
        { serviceDate: '2026-01-02', contacts: 100, ahtSeconds: 300 },
        { serviceDate: '2026-02-03', contacts: 120, ahtSeconds: 330 },
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
        { serviceDate: '2026-01-02', contacts: 150, ahtSeconds: 300 },
        { serviceDate: '2026-01-03', contacts: 250, ahtSeconds: 360 },
        { serviceDate: '2026-02-02', contacts: 300, ahtSeconds: 420 }
      ]
    }

    const updateDraft = createUpdatedPlanDraft({
      sourcePlan,
      budgetPlan: { id: 'budget-plan', name: '2026 Budget' },
      actuals,
      actualsThroughMonth: '2026-02-01',
      name: '2026 Mar Update',
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
      averageDailyVolume: 200,
      peakDailyVolume: 250
    })
    expect(updateDraft.demandSource.forecastDailySnapshot.map((row) => row.serviceDate)).toEqual([
      '2026-01-02',
      '2026-01-03',
      '2026-02-02',
      '2026-03-02'
    ])
    expect(updateDraft.demandSource.forecastDailySnapshot.find((row) => row.serviceDate === '2026-03-02')).toMatchObject({
      contacts: 110
    })
  })
})
