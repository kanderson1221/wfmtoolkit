import { buildPlanningGroupForecastsHash, buildPlanningGroupNewForecastHash, parseHashRoute } from '../appRoutes'

describe('appRoutes', () => {
  it('builds and parses staffing-group forecast routes with a selected forecast id', () => {
    const hash = buildPlanningGroupForecastsHash('center-1', 'group-1', 2026, 'forecast-1')

    expect(hash).toBe('#planning/center/center-1/group/group-1/forecasts/year/2026/project/forecast-1')
    expect(parseHashRoute(hash)).toMatchObject({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2026,
      forecastId: 'forecast-1'
    })
  })

  it('builds and parses staffing-group new forecast routes with a creation seed', () => {
    const hash = buildPlanningGroupNewForecastHash('center-1', 'group-1', 2027, {
      sourceKind: 'manual_monthly',
      forecastType: 'reforecast',
      coverageStartMonthIndex: 5,
      coverageStartDate: '2027-06-01',
      coverageEndDate: '2027-12-31'
    })

    expect(hash).toBe('#planning/center/center-1/group/group-1/forecasts/year/2027/new/source/manual_monthly/type/budget/coverage/2027-06-01/2027-12-31')
    expect(parseHashRoute(hash)).toMatchObject({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027,
      sourceKind: 'manual_monthly',
      forecastType: 'budget',
      coverageStartMonthIndex: 0,
      coverageStartDate: '2027-06-01',
      coverageEndDate: '2027-12-31'
    })
  })
})
