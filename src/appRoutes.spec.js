import {
  buildPlanningCenterHash,
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
    expect(buildPlanningGroupHash('center-1', 'group-1')).toBe('#planning/center/center-1/group/group-1')
    expect(buildPlanningGroupHash('center-1', 'group-1', 2027)).toBe('#planning/center/center-1/group/group-1/year/2027')
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

  it('only mutates the browser hash when navigation targets change', () => {
    window.location.hash = '#planning'

    navigateToHash('#planning')
    expect(window.location.hash).toBe('#planning')

    navigateToHash('#planning/center/center-1')
    expect(window.location.hash).toBe('#planning/center/center-1')
  })
})
