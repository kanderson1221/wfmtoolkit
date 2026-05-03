import {
  buildPlanningCenterHash,
  buildPlanningCenterForecastsHash,
  buildPlanningGroupForecastsHash,
  buildPlanningGroupNewForecastHash,
  buildPlanningGroupHash,
  buildPlanningHomeHash,
  buildPlanningNewPlanHash,
  buildPlanningPlanHash,
  defaultRoute,
  isPublicHomeHash,
  navigateToHash,
  parseHashRoute
} from './appRoutes'

describe('appRoutes', () => {
  it('builds planning hashes through shared helpers', () => {
    expect(buildPlanningHomeHash()).toBe('#planning')
    expect(buildPlanningCenterHash('center-1')).toBe('#planning/center/center-1')
    expect(buildPlanningCenterForecastsHash('center-1')).toBe('#planning/center/center-1/forecasts')
    expect(buildPlanningGroupHash('center-1', 'group-1')).toBe('#planning/center/center-1/group/group-1')
    expect(buildPlanningGroupHash('center-1', 'group-1', 2027)).toBe('#planning/center/center-1/group/group-1/year/2027')
    expect(buildPlanningGroupHash('center-1', 'group-1', 2027, { tab: 'forecasts' })).toBe('#planning/center/center-1/group/group-1/year/2027/tab/forecasts')
    expect(buildPlanningGroupHash('center-1', 'group-1', 2027, { tab: 'intraday' })).toBe('#planning/center/center-1/group/group-1/year/2027/tab/intraday')
    expect(buildPlanningGroupForecastsHash('center-1', 'group-1')).toBe('#planning/center/center-1/group/group-1/forecasts')
    expect(buildPlanningGroupForecastsHash('center-1', 'group-1', 2027)).toBe('#planning/center/center-1/group/group-1/forecasts/year/2027')
    expect(buildPlanningGroupNewForecastHash('center-1', 'group-1', 2027, { forecastType: 'budget' })).toBe('#planning/center/center-1/group/group-1/forecasts/year/2027/new/type/budget')
    expect(buildPlanningGroupNewForecastHash('center-1', 'group-1', 2027, { sourceKind: 'imported_daily', forecastType: 'budget' })).toBe('#planning/center/center-1/group/group-1/forecasts/year/2027/new/source/imported_daily/type/budget')
    expect(buildPlanningGroupNewForecastHash('center-1', 'group-1', 2027, {
      forecastType: 'reforecast',
      coverageStartDate: '2027-04-01',
      coverageEndDate: '2027-12-31'
    })).toBe('#planning/center/center-1/group/group-1/forecasts/year/2027/new/type/budget/coverage/2027-04-01/2027-12-31')
    expect(buildPlanningGroupNewForecastHash('center-1', 'group-1', 2027, {
      sourceKind: 'manual_monthly',
      forecastType: 'reforecast',
      coverageStartDate: '2027-04-01',
      coverageEndDate: '2027-12-31'
    })).toBe('#planning/center/center-1/group/group-1/forecasts/year/2027/new/source/manual_monthly/type/budget/coverage/2027-04-01/2027-12-31')
    expect(buildPlanningPlanHash('center-1', 'group-1', 'plan-1')).toBe('#planning/center/center-1/group/group-1/plan/plan-1')
    expect(buildPlanningNewPlanHash('center-1', 'group-1', 2027)).toBe('#planning/center/center-1/group/group-1/plan/new/year/2027/method/workload_ratio')
    expect(buildPlanningNewPlanHash('center-1', 'group-1', 2027, { requirementMethod: 'workload_ratio' })).toBe('#planning/center/center-1/group/group-1/plan/new/year/2027/method/workload_ratio')
    expect(buildPlanningNewPlanHash('center-1', 'group-1', 2027, { requirementMethod: 'intraday_erlang' })).toBe('#planning/center/center-1/group/group-1/plan/new/year/2027/method/intraday_erlang')
    expect(buildPlanningNewPlanHash('center-1', 'group-1', 2027, {
      requirementMethod: 'intraday_erlang',
      updateSourcePlanId: 'plan-source',
      actualsThroughMonth: '2027-03-01',
      updatePlanName: '2027 Apr Update'
    })).toBe('#planning/center/center-1/group/group-1/plan/new/year/2027/method/intraday_erlang/update/plan-source/actuals-through/2027-03-01/name/2027%20Apr%20Update')
  })

  it('treats home-like hashes as public landing routes', () => {
    expect(isPublicHomeHash('')).toBe(true)
    expect(isPublicHomeHash('#home')).toBe(true)
    expect(isPublicHomeHash('#/home')).toBe(true)
    expect(isPublicHomeHash('#home/')).toBe(true)
    expect(isPublicHomeHash('#/apps')).toBe(true)
    expect(isPublicHomeHash('#planning')).toBe(false)
  })

  it('normalizes home-like hashes to the default route', () => {
    expect(parseHashRoute('#/home')).toEqual(defaultRoute)
    expect(parseHashRoute('#home/')).toEqual(defaultRoute)
    expect(parseHashRoute('#/apps')).toEqual(defaultRoute)
  })

  it('routes legacy standalone forecasting hashes to planning home', () => {
    expect(parseHashRoute('#forecasting')).toEqual(defaultRoute)
    expect(parseHashRoute('#forecast')).toEqual(defaultRoute)
    expect(parseHashRoute('#calculators/forecasting')).toEqual(defaultRoute)
    expect(parseHashRoute('#calculators/forecast')).toEqual(defaultRoute)
  })

  it('parses staffing-group forecast routes inside planning', () => {
    expect(parseHashRoute('#planning/center/center-1/group/group-1/forecasts')).toMatchObject({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1'
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/forecasts/year/2027')).toMatchObject({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/forecasts/year/2027/new/type/budget')).toMatchObject({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027,
      sourceKind: null,
      forecastType: 'budget'
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/forecasts/year/2027/new/source/imported_daily/type/budget')).toMatchObject({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027,
      sourceKind: 'imported_daily',
      forecastType: 'budget'
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/forecasts/year/2027/new/source/manual_monthly/type/budget/coverage/2027-10-01/2028-03-31')).toMatchObject({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027,
      sourceKind: 'manual_monthly',
      forecastType: 'budget',
      coverageStartDate: '2027-10-01',
      coverageEndDate: '2028-03-31'
    })
    expect(parseHashRoute('#planning/center/center-1/forecasts')).toMatchObject({
      app: 'planning',
      page: 'forecasts',
      centerId: 'center-1'
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/year/2027/tab/forecasts')).toMatchObject({
      app: 'planning',
      page: 'center',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027,
      groupTab: 'forecasts'
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/year/2027/tab/intraday')).toMatchObject({
      app: 'planning',
      page: 'center',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027,
      groupTab: 'intraday'
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/plan/new/year/2027/method/workload_ratio')).toMatchObject({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027,
      requirementMethod: 'workload_ratio'
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/plan/new/year/2027/method/intraday_erlang')).toMatchObject({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027,
      requirementMethod: 'intraday_erlang'
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/plan/new/year/2027/method/intraday_erlang/update/plan-source/actuals-through/2027-03-01/name/2027%20Apr%20Update')).toMatchObject({
      app: 'planning',
      page: 'editor',
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'new',
      year: 2027,
      requirementMethod: 'intraday_erlang',
      updateSourcePlanId: 'plan-source',
      actualsThroughMonth: '2027-03-01',
      updatePlanName: '2027 Apr Update'
    })
  })

  it('only mutates the browser hash when navigation targets change', () => {
    window.location.hash = '#planning'

    navigateToHash('#planning')
    expect(window.location.hash).toBe('#planning')

    navigateToHash('#planning/center/center-1')
    expect(window.location.hash).toBe('#planning/center/center-1')
  })
})
