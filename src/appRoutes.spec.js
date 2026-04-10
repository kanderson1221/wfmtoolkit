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
    expect(buildPlanningGroupForecastsHash('center-1', 'group-1')).toBe('#planning/center/center-1/group/group-1/forecasts')
    expect(buildPlanningGroupForecastsHash('center-1', 'group-1', 2027)).toBe('#planning/center/center-1/group/group-1/forecasts/year/2027')
    expect(buildPlanningGroupNewForecastHash('center-1', 'group-1', 2027, { forecastType: 'budget' })).toBe('#planning/center/center-1/group/group-1/forecasts/year/2027/new/type/budget')
    expect(buildPlanningGroupNewForecastHash('center-1', 'group-1', 2027, { forecastType: 'reforecast', coverageStartMonthIndex: 3 })).toBe('#planning/center/center-1/group/group-1/forecasts/year/2027/new/type/reforecast/month/3')
    expect(buildPlanningPlanHash('center-1', 'group-1', 'plan-1')).toBe('#planning/center/center-1/group/group-1/plan/plan-1')
    expect(buildPlanningNewPlanHash('center-1', 'group-1', 2027)).toBe('#planning/center/center-1/group/group-1/plan/new/year/2027')
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

  it('parses calculator tool hashes including forecasting', () => {
    expect(parseHashRoute('#forecasting')).toMatchObject({
      app: 'calculators',
      tool: 'forecasting'
    })
    expect(parseHashRoute('#calculators/forecasting')).toMatchObject({
      app: 'calculators',
      tool: 'forecasting'
    })
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
      forecastType: 'budget'
    })
    expect(parseHashRoute('#planning/center/center-1/group/group-1/forecasts/year/2027/new/type/reforecast/month/4')).toMatchObject({
      app: 'planning',
      page: 'group-forecasts',
      centerId: 'center-1',
      groupId: 'group-1',
      year: 2027,
      forecastType: 'reforecast',
      coverageStartMonthIndex: 4
    })
    expect(parseHashRoute('#planning/center/center-1/forecasts')).toMatchObject({
      app: 'planning',
      page: 'forecasts',
      centerId: 'center-1'
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
