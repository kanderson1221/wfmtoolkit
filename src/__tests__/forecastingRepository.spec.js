import { createForecastingRepository } from '../forecastingRepository'
import * as localDataStore from '../storage/localDataStore'

describe('forecastingRepository', () => {
  it('loads and persists forecast workspaces by scope', async () => {
    const repository = createForecastingRepository()
    const projects = [
      {
        id: 'forecast-1',
        name: 'Guest Forecast',
        updatedAt: '2026-04-05T14:00:00.000Z',
        lastRun: {
          runAt: '2026-04-05T14:00:00.000Z',
          monthlyRollup: [
            {
              monthStart: '2026-01-01',
              monthLabel: 'Jan 2026',
              contacts: 12000,
              lowerBoundContacts: 11500,
              upperBoundContacts: 12600
            }
          ]
        }
      }
    ]

    await repository.persistWorkspace(projects, 'user-1')
    const loadedProjects = await repository.loadWorkspace('user-1')

    expect(loadedProjects).toHaveLength(1)
    expect(loadedProjects[0].id).toBe('forecast-1')
  })

  it('reports read failures without throwing when a forecast scope cannot be read', async () => {
    const repository = createForecastingRepository()
    vi.spyOn(localDataStore, 'loadForecastWorkspaceFromDexie').mockRejectedValueOnce(new Error('blocked'))

    const result = await repository.loadWorkspaceResult('user-1')

    expect(result.projects).toEqual([])
    expect(result.error).toBeTruthy()
  })

  it('drops legacy interval state from saved forecasts', async () => {
    const repository = createForecastingRepository()

    await repository.persistWorkspace([
      {
        id: 'forecast-legacy',
        name: 'Legacy Forecast',
        intervalModel: {
          profileName: 'Old Ratios',
          lastRun: {
            runAt: '2026-04-05T14:00:00.000Z'
          }
        }
      }
    ], 'user-2')

    const loadedProjects = await repository.loadWorkspace('user-2')

    expect(loadedProjects).toHaveLength(1)
    expect(loadedProjects[0].intervalModel).toBeUndefined()
  })
})
