import {
  buildForecastPlanDependencyIndex,
  findForecastPlanDependencies
} from '../forecastDependencies'

describe('forecast plan dependencies', () => {
  const plans = [
    {
      id: 'budget-2026',
      name: '2026 Budget',
      planType: 'budget',
      status: 'draft',
      planningYear: 2026,
      demandSource: { mode: 'forecast', forecastProjectId: 'forecast-1' }
    },
    {
      id: 'update-2026',
      planType: 'update',
      planningYear: 2026,
      demandSource: { mode: 'forecast', forecastProjectId: 'forecast-1' }
    },
    {
      id: 'budget-2027',
      planType: 'budget',
      status: 'finalized',
      planningYear: 2027,
      demandSource: { mode: 'forecast', forecastProjectId: 'forecast-2' }
    },
    {
      id: 'manual-budget',
      name: 'Manual Budget',
      planType: 'budget',
      status: 'draft',
      planningYear: 2028,
      demandSource: { mode: 'manual' }
    }
  ]

  it('names exact dependent plans and normalizes their editable state', () => {
    expect(findForecastPlanDependencies(plans, 'forecast-1')).toEqual([
      { id: 'budget-2026', label: '2026 Budget', state: 'draft', isDraft: true },
      { id: 'update-2026', label: '2026 Update', state: 'finalized', isDraft: false }
    ])
  })

  it('indexes only forecast-backed plan dependencies', () => {
    expect(buildForecastPlanDependencyIndex(plans)).toEqual({
      'forecast-1': [
        { id: 'budget-2026', label: '2026 Budget', state: 'draft', isDraft: true },
        { id: 'update-2026', label: '2026 Update', state: 'finalized', isDraft: false }
      ],
      'forecast-2': [
        { id: 'budget-2027', label: '2027 Budget', state: 'finalized', isDraft: false }
      ]
    })
  })
})
