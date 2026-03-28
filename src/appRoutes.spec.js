import { defaultRoute, isPublicHomeHash, parseHashRoute } from './appRoutes'

describe('appRoutes', () => {
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
})
