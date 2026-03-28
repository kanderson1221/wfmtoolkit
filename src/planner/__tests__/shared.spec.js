import { buildPlanningYearRange, getCurrentCalendarYear, resolvePlanningYear } from '../shared'

describe('planner shared year helpers', () => {
  it('resolves valid planning years and honors explicit fallbacks', () => {
    expect(resolvePlanningYear(2027, 2026)).toBe(2027)
    expect(resolvePlanningYear('2028', 2026)).toBe(2028)
    expect(resolvePlanningYear(null, 2026)).toBe(2026)
    expect(resolvePlanningYear('not-a-year', '2025')).toBe(2025)
  })

  it('falls back to the current calendar year when no valid year is provided', () => {
    expect(resolvePlanningYear(undefined, 'not-a-year')).toBe(getCurrentCalendarYear())
  })

  it('builds a planning-year range around the normalized anchor year', () => {
    expect(buildPlanningYearRange('2027', 1, 2)).toEqual([2026, 2027, 2028, 2029])
  })
})
