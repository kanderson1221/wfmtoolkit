import {
  CENTERS_STORAGE_KEY,
  LEGACY_PLANS_STORAGE_KEY
} from '../../planningStorage'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../plannerModel'
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

const clonePlain = (value) => JSON.parse(JSON.stringify(value))

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
        serviceLevelPercent: 80,
        serviceLevelThresholdSeconds: 20,
        holidayCalendarId: 'inherit',
        holidayScheduleMode: 'closed',
        intraday: {
          intervalLengthMinutes: 30,
          intervalRatios: [
            { startTime: '08:00', ratioPercent: 30 },
            { startTime: '08:30', ratioPercent: 20 },
            { startTime: '09:00', ratioPercent: 25 },
            { startTime: '09:30', ratioPercent: 25 }
          ]
        },
        actuals: {
          sourceMode: 'daily_upload',
          dailyRows: [
            { serviceDate: '2026-01-02', contacts: 110, ahtSeconds: 300 }
          ],
          uploadedFileName: 'group-actuals.csv',
          uploadedHeaders: ['service_date', 'contacts', 'average_handle_time_seconds'],
          columnMapping: {
            dateColumn: 'service_date',
            volumeColumn: 'contacts',
            ahtColumn: 'average_handle_time_seconds'
          }
        },
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
    sourceKind: 'imported_daily',
    centerManagedHolidays: true,
    sourceCenterHolidayProfiles: [
      {
        year: 2026,
        customHolidays: [
          {
            label: 'Thanksgiving Day',
            date: '2026-11-26',
            sourceRuleId: 'thanksgiving_day',
            month: 11,
            day: 26
          }
        ]
      }
    ],
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
    ahtHistoryRows: [
      { ds: '2025-01-01', contacts: 100, ahtSeconds: 280 },
      { ds: '2025-01-02', contacts: 120, ahtSeconds: 285 }
    ],
    uploadedFileName: 'history.csv',
    uploadedHeaders: ['service_date', 'call_volume', 'internal_notes'],
    uploadedRows: [
      { rowIndex: 2, service_date: '2025-01-01', call_volume: '100', internal_notes: 'sensitive' }
    ],
    sourceData: {
      fileName: 'imported-forecast.csv',
      headers: ['date', 'forecast'],
      rows: [
        { rowIndex: 2, date: '2026-01-01', forecast: '110' }
      ],
      mapping: {
        dateColumn: 'date',
        forecastColumn: 'forecast',
        lowerColumn: '',
        upperColumn: ''
      },
      issues: []
    },
    manualAdjustments: [
      { startDate: '2026-01-01', endDate: '2026-01-03', adjustmentType: 'delta', value: 25, reason: 'Promo spike' }
    ],
    lastRun: {
      runAt: '2026-04-08T14:00:00.000Z',
      inputSignature: '{"seed":"forecast-run"}',
      dailyForecast: [
        { ds: '2026-01-01', yhat: 110, yhatLower: 100, yhatUpper: 120, isHistory: false }
      ],
      monthlyRollup: [
        { monthStart: '2026-01-01', monthLabel: 'Jan 2026', contacts: 3400, peakDailyVolume: 120 }
      ],
      components: {
        trend: [{ label: '2026-01-01', value: 110 }],
        yearly: [],
        monthly: [{ label: 'Jan 01', value: 5.7 }],
        weekly: [],
        holidays: []
      },
      summary: {
        projectedTotalContacts: 3400
      },
      diagnostics: {
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
    expect(loadedCenters[0].groups[0].actuals).toMatchObject({
      sourceMode: 'daily_upload',
      uploadedFileName: 'group-actuals.csv'
    })
    expect(loadedCenters[0].groups[0].actuals.dailyRows[0]).toMatchObject({
      serviceDate: '2026-01-02',
      contacts: 110,
      ahtSeconds: 300
    })
    expect(loadedCenters[0].groups[0]).toMatchObject({
      serviceLevelPercent: 80,
      serviceLevelThresholdSeconds: 20
    })
    expect(loadedCenters[0].groups[0].intraday).toMatchObject({
      intervalLengthMinutes: 30
    })
    expect(loadedCenters[0].groups[0].intraday.intervalRatios.slice(0, 4)).toEqual([
      { startTime: '08:00', ratioPercent: 30 },
      { startTime: '08:30', ratioPercent: 20 },
      { startTime: '09:00', ratioPercent: 25 },
      { startTime: '09:30', ratioPercent: 25 }
    ])
    expect(loadedCenters[0].groups[0].intraday.intervalRatios).toHaveLength(18)
    expect(loadedForecasts[0].sourceKind).toBe('imported_daily')
    expect(loadedForecasts[0].sourceData.fileName).toBe('imported-forecast.csv')
    expect(loadedForecasts[0].ahtHistoryRows).toEqual([
      { ds: '2025-01-01', contacts: 100, ahtSeconds: 280 },
      { ds: '2025-01-02', contacts: 120, ahtSeconds: 285 }
    ])
    expect(loadedForecasts[0].sourceCenterHolidayProfiles).toEqual([
      {
        year: 2026,
        customHolidays: [
          {
            label: 'Thanksgiving Day',
            date: '2026-11-26',
            sourceRuleId: 'thanksgiving_day',
            month: 11,
            day: 26
          }
        ]
      }
    ])
    expect(loadedForecasts[0].uploadedHeaders).toEqual(['service_date', 'call_volume', 'internal_notes'])
    expect(loadedForecasts[0].uploadedRows).toEqual([])
    expect(loadedForecasts[0].lastRun.monthlyRollup[0].contacts).toBe(3400)
    expect(loadedForecasts[0].lastRun.components.monthly[0].value).toBe(5.7)
    expect(loadedForecasts[0].manualAdjustments[0]).toMatchObject({
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      adjustmentType: 'delta',
      value: 25,
      reason: 'Promo spike'
    })
    expect(loadedForecasts[0].lastRun.inputSignature).toBe('{"seed":"forecast-run"}')
    expect(loadedDraft?.ui?.activeSection).toBe('forecast')
  })

  it('ignores planner draft reads and writes when the draft key is empty', async () => {
    const persistedDraft = await persistPlannerDraftToDexie('', {
      plan: {
        planningYear: 2026
      }
    })

    const loadedDraft = await loadPlannerDraftFromDexie('')

    expect(persistedDraft.autosavedAt).toBeTruthy()
    expect(loadedDraft).toBeNull()
  })

  it('preserves an intraday Erlang plan method after Dexie save and reload', async () => {
    const centers = clonePlain(sampleCenters)
    centers[0].groups[0].plans[0] = {
      ...centers[0].groups[0].plans[0],
      requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
      intradayErlangResults: {
        version: 1,
        calculatedAt: '2026-01-15T12:00:00.000Z',
        inputSignature: 'v1:2:abc123',
        rowCount: 2,
        monthCount: 1,
        monthlyOutputs: [
          {
            monthIndex: 0,
            erlangStaffedHours: 123.4
          }
        ],
        intervalOutputs: [],
        dailyOutputs: []
      }
    }

    await persistPlanningWorkspaceToDexie(centers, 'default')

    const loadedCenters = await loadPlanningWorkspaceFromDexie('default')
    const loadedPlan = loadedCenters[0].groups[0].plans[0]

    expect(loadedPlan.requirementMethod).toBe(PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG)
    expect(loadedPlan.intradayErlangResults).toMatchObject({
      inputSignature: 'v1:2:abc123',
      monthlyOutputs: [
        {
          monthIndex: 0,
          erlangStaffedHours: 123.4
        }
      ]
    })
  })

  it('infers intraday Erlang for older stored plan rows that have Erlang results but no method', async () => {
    const centers = clonePlain(sampleCenters)
    centers[0].groups[0].plans[0] = {
      ...centers[0].groups[0].plans[0],
      requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
      intradayErlangResults: {
        version: 1,
        calculatedAt: '2026-01-15T12:00:00.000Z',
        inputSignature: 'v1:2:abc123',
        rowCount: 2,
        monthCount: 1,
        monthlyOutputs: [
          {
            monthIndex: 0,
            erlangStaffedHours: 123.4
          }
        ],
        intervalOutputs: [],
        dailyOutputs: []
      }
    }

    await persistPlanningWorkspaceToDexie(centers, 'default')

    const [storedPlanRow] = await wfmDexie.plans.toArray()
    delete storedPlanRow.requirementMethod
    await wfmDexie.plans.put(storedPlanRow)

    const loadedCenters = await loadPlanningWorkspaceFromDexie('default')

    expect(loadedCenters[0].groups[0].plans[0].requirementMethod).toBe(PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG)
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
    expect(loadedForecasts[0].sourceKind).toBe('imported_daily')
    expect(loadedForecasts[0].lastRun.components.monthly[0].value).toBe(5.7)
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
    expect(backupSummary).toMatchObject({
      backupFormat: 'workspace_snapshot_v2',
      backupFormatLabel: 'Current workspace backup',
      schemaVersion: 2,
      exportedAt: backupEnvelope.exportedAt,
      recordScopeLabel: 'All local data'
    })
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

  it('rejects unsupported future backup schemas before replacing current data', async () => {
    await persistPlanningWorkspaceToDexie(sampleCenters, 'default')
    const backupEnvelope = await exportLocalDataBackup()
    const futureBackupEnvelope = {
      ...backupEnvelope,
      schemaVersion: backupEnvelope.schemaVersion + 1
    }

    expect(() => analyzeLocalDataBackup(futureBackupEnvelope)).toThrow(
      'Backup file uses newer schema version 3'
    )
    await expect(importLocalDataBackup(futureBackupEnvelope)).rejects.toThrow(
      'Backup file uses newer schema version 3'
    )

    const loadedCenters = await loadPlanningWorkspaceFromDexie('default')
    expect(loadedCenters).toHaveLength(1)
    expect(loadedCenters[0].name).toBe('North America Operations')
  })

  it('rejects an explicitly unsupported compact backup format', async () => {
    const backupEnvelope = await exportLocalDataBackup()

    expect(() => analyzeLocalDataBackup({
      ...backupEnvelope,
      backupFormat: 'workspace_snapshot_v99'
    })).toThrow('Backup file uses unsupported format "workspace_snapshot_v99".')
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
