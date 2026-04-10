import {
  CENTERS_STORAGE_KEY,
  LEGACY_PLANS_STORAGE_KEY
} from '../../planningStorage'
import { FORECAST_PROJECTS_STORAGE_KEY } from '../../forecastingStorage'
import { DRAFT_STORAGE_KEY } from '../../plannerDraftStorage'
import {
  analyzeLocalDataBackup,
  clearLocalDataStore,
  ensureLegacyLocalStorageMigrated,
  exportLocalDataBackup,
  importLocalDataBackup,
  loadForecastWorkspaceFromDexie,
  loadPlannerDraftFromDexie,
  loadPlanningWorkspaceFromDexie,
  persistForecastWorkspaceToDexie,
  persistPlannerDraftToDexie,
  persistPlanningWorkspaceToDexie
} from '../localDataStore'
import { wfmDexie } from '../wfmDexie'

const sampleCenters = [
  {
    id: 'center-1',
    name: 'North America Operations',
    timezone: 'America/New_York',
    holidayProfiles: [
      {
        year: 2026,
        holidayCalendarId: 'none',
        disabledHolidayRuleIds: [],
        customHolidays: [
          {
            label: 'Company Day',
            date: '2026-12-26'
          }
        ]
      }
    ],
    operatingWeekdays: [1, 2, 3, 4, 5],
    operatingOpenTime: '08:00',
    operatingCloseTime: '17:00',
    defaultPaidHoursPerDay: 8,
    defaultOccupancyPercent: 90,
    defaultAdherencePercent: 95,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    groups: [
      {
        id: 'group-1',
        name: 'Consumer Voice',
        operatingWeekdays: [1, 2, 3, 4, 5],
        defaultPaidHoursPerDay: 8,
        defaultOccupancyPercent: 90,
        defaultAdherencePercent: 95,
        holidayCalendarId: 'inherit',
        holidayScheduleMode: 'closed',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        plans: [
          {
            id: 'plan-1',
            name: '2026 Plan',
            planningYear: 2026,
            operatingWeekdays: [1, 2, 3, 4, 5],
            holidayCalendarId: 'none',
            disabledHolidayRuleIds: [],
            customHolidays: [],
            holidayScheduleMode: 'closed',
            presenceMonths: Array.from({ length: 12 }, () => ({ paidHoursPerDay: 8 })),
            randomDefaults: {
              occupancyPercent: 90,
              adherencePercent: 95
            },
            randomMonths: Array.from({ length: 12 }, () => ({ occupancyPercent: 90, adherencePercent: 95 })),
            useMonthlyRandomOverrides: false,
            planMonths: Array.from({ length: 12 }, () => ({ contacts: 1000, ahtSeconds: 300, peakDayUpliftPercent: 0 })),
            actualsMonths: Array.from({ length: 12 }, () => ({ actualContacts: null, actualAhtSeconds: null })),
            trainingSettings: {
              trainingDurationWorkdays: 20,
              graduationYieldPercent: 100,
              availableTrainers: 1,
              maxClassSize: 10,
              postTrainingNestingDays: 0,
              startOnFirstBusinessDayOfWeek: true
            },
            nextYearOpening: {
              rosterHeadcount: 20,
              frontlineHeadcount: 18
            },
            demandSource: {
              mode: 'manual',
              forecastProjectId: '',
              forecastProjectName: '',
              forecastRunAt: '',
              importedAt: '',
              importedPlanningYear: null,
              forecastMonthSnapshot: []
            },
            startingHeadcount: 20,
            startingFrontlineHeadcount: 18,
            staffingMonths: Array.from({ length: 12 }, () => ({ frontlineAttritionHeadcount: 0 })),
            trainingClasses: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          }
        ]
      }
    ]
  }
]

const sampleForecasts = [
  {
    id: 'forecast-1',
    name: 'Consumer Voice 2026 Forecast',
    centerId: 'center-1',
    planningContext: {
      centerId: 'center-1',
      groupId: 'group-1',
      planId: 'plan-1',
      planningYear: 2026,
      groupName: 'Consumer Voice'
    },
    historyRows: [
      { ds: '2025-01-01', y: 100 },
      { ds: '2025-01-02', y: 120 }
    ],
    lastRun: {
      runAt: '2026-04-08T14:00:00.000Z',
      dailyForecast: [
        { ds: '2026-01-01', yhat: 110, yhatLower: 100, yhatUpper: 120, isHistory: false }
      ],
      monthlyRollup: [
        { monthStart: '2026-01-01', monthLabel: 'Jan 2026', contacts: 3400, peakDailyVolume: 120 }
      ],
      components: {
        trend: [{ label: '2026-01-01', value: 110 }],
        yearly: [],
        weekly: [],
        holidays: []
      },
      summary: {
        projectedTotalContacts: 3400
      },
      diagnostics: {
        dataPrepActions: [],
        warnings: [],
        validationNotes: [],
        holdout: null
      }
    },
    createdAt: '2026-04-08T14:00:00.000Z',
    updatedAt: '2026-04-08T14:00:00.000Z'
  }
]

const clearLegacyLocalStorage = () => {
  const storage = window.localStorage

  if (typeof storage?.clear === 'function') {
    storage.clear()
    return
  }

  if (storage && typeof storage === 'object') {
    Object.keys(storage).forEach((key) => {
      delete storage[key]
    })
  }
}

describe('localDataStore', () => {
  beforeEach(async () => {
    const storage = new Map()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        get length() {
          return storage.size
        },
        key: (index) => [...storage.keys()][index] ?? null,
        getItem: (key) => (storage.has(key) ? storage.get(key) : null),
        setItem: (key, value) => {
          storage.set(String(key), String(value))
        },
        removeItem: (key) => {
          storage.delete(String(key))
        },
        clear: () => {
          storage.clear()
        }
      }
    })
    await clearLocalDataStore()
    clearLegacyLocalStorage()
  })

  it('round-trips planning data, forecasts, and planner drafts through Dexie', async () => {
    await persistPlanningWorkspaceToDexie(sampleCenters, 'default')
    await persistForecastWorkspaceToDexie(sampleForecasts, 'default:center:center-1:group:group-1:forecasts')
    await persistPlannerDraftToDexie('user-1:plan:plan-1', {
      plan: {
        planningYear: 2026
      },
      ui: {
        activeSection: 'forecast'
      }
    })

    const loadedCenters = await loadPlanningWorkspaceFromDexie('default')
    const loadedForecasts = await loadForecastWorkspaceFromDexie('default:center:center-1:group:group-1:forecasts')
    const loadedDraft = await loadPlannerDraftFromDexie('user-1:plan:plan-1')

    expect(loadedCenters[0].groups[0].plans[0].planningYear).toBe(2026)
    expect(loadedForecasts[0].lastRun.monthlyRollup[0].contacts).toBe(3400)
    expect(loadedDraft?.ui?.activeSection).toBe('forecast')
  })

  it('migrates legacy localStorage data into Dexie once', async () => {
    window.localStorage.setItem(`${CENTERS_STORAGE_KEY}.default`, JSON.stringify(sampleCenters))
    window.localStorage.setItem(`${FORECAST_PROJECTS_STORAGE_KEY}.default:center:center-1:group:group-1:forecasts`, JSON.stringify(sampleForecasts))
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      'guest:plan:new': {
        plan: {
          planningYear: 2026
        },
        ui: {
          activeSection: 'forecast'
        },
        autosavedAt: '2026-04-08T14:00:00.000Z'
      }
    }))

    const migrationResult = await ensureLegacyLocalStorageMigrated()
    const loadedCenters = await loadPlanningWorkspaceFromDexie('default')
    const loadedForecasts = await loadForecastWorkspaceFromDexie('default:center:center-1:group:group-1:forecasts')
    const loadedDraft = await loadPlannerDraftFromDexie('guest:plan:new')

    expect(migrationResult.migrated).toBe(true)
    expect(loadedCenters).toHaveLength(1)
    expect(loadedForecasts).toHaveLength(1)
    expect(loadedDraft?.ui?.activeSection).toBe('forecast')
  })

  it('exports and reimports the full local data backup envelope', async () => {
    await persistPlanningWorkspaceToDexie(sampleCenters, 'default')
    await persistForecastWorkspaceToDexie(sampleForecasts, 'default:center:center-1:group:group-1:forecasts')
    await persistPlannerDraftToDexie('user-1:plan:plan-1', {
      plan: {
        planningYear: 2026
      },
      ui: {
        activeSection: 'forecast'
      }
    })

    const backupEnvelope = await exportLocalDataBackup()
    const backupSummary = analyzeLocalDataBackup(backupEnvelope)
    const planningWorkspaceBackup = backupEnvelope.data.workspaces.find((workspace) => workspace.scope === 'default')
    const forecastWorkspaceBackup = backupEnvelope.data.workspaces.find(
      (workspace) => workspace.scope === 'default:center:center-1:group:group-1:forecasts'
    )

    expect(backupEnvelope.backupFormat).toBe('workspace_snapshot_v2')
    expect(Array.isArray(backupEnvelope.data.workspaces)).toBe(true)
    expect(backupEnvelope.data.planDemandMonths).toBeUndefined()
    expect(planningWorkspaceBackup?.planningCenters[0].name).toBe('North America Operations')
    expect(forecastWorkspaceBackup?.forecasts[0].name).toBe('Consumer Voice 2026 Forecast')

    await clearLocalDataStore()
    await importLocalDataBackup(backupEnvelope)

    const restoredCenters = await loadPlanningWorkspaceFromDexie('default')
    const restoredForecasts = await loadForecastWorkspaceFromDexie('default:center:center-1:group:group-1:forecasts')
    const restoredDraft = await loadPlannerDraftFromDexie('user-1:plan:plan-1')

    expect(backupSummary.callCenterCount).toBe(1)
    expect(restoredCenters[0].name).toBe('North America Operations')
    expect(restoredForecasts[0].name).toBe('Consumer Voice 2026 Forecast')
    expect(restoredDraft?.plan?.planningYear).toBe(2026)
  })

  it('imports legacy table-dump backups for compatibility', async () => {
    await persistPlanningWorkspaceToDexie(sampleCenters, 'default')
    await persistForecastWorkspaceToDexie(sampleForecasts, 'default:center:center-1:group:group-1:forecasts')

    const legacyTableData = Object.fromEntries(
      await Promise.all(
        wfmDexie.tables.map(async (table) => [table.name, await table.toArray()])
      )
    )

    const legacyBackupEnvelope = {
      schemaVersion: 1,
      exportedAt: '2026-04-08T14:00:00.000Z',
      appVersion: 'test',
      data: legacyTableData
    }

    await clearLocalDataStore()
    await importLocalDataBackup(legacyBackupEnvelope)

    const restoredCenters = await loadPlanningWorkspaceFromDexie('default')
    const restoredForecasts = await loadForecastWorkspaceFromDexie('default:center:center-1:group:group-1:forecasts')

    expect(restoredCenters[0].name).toBe('North America Operations')
    expect(restoredForecasts[0].lastRun.monthlyRollup[0].contacts).toBe(3400)
  })

  it('keeps existing data intact when backup validation fails before import', async () => {
    await persistPlanningWorkspaceToDexie(sampleCenters, 'default')

    await expect(importLocalDataBackup({ nope: true })).rejects.toThrow()

    const loadedCenters = await loadPlanningWorkspaceFromDexie('default')
    expect(loadedCenters).toHaveLength(1)
    expect(loadedCenters[0].name).toBe('North America Operations')
  })

  it('migrates legacy standalone monthly plans when no call center workspace exists', async () => {
    window.localStorage.setItem(LEGACY_PLANS_STORAGE_KEY, JSON.stringify([
      {
        id: 'legacy-plan-1',
        name: 'Voice Team',
        planningYear: 2026,
        operatingWeekdays: [1, 2, 3, 4, 5],
        presenceMonths: [{ paidHoursPerDay: 8 }],
        randomDefaults: {
          occupancyPercent: 90,
          adherencePercent: 95
        }
      }
    ]))

    await ensureLegacyLocalStorageMigrated()
    const loadedCenters = await loadPlanningWorkspaceFromDexie('default')

    expect(loadedCenters).toHaveLength(1)
    expect(loadedCenters[0].groups[0].plans[0].planningYear).toBe(2026)
  })
})
