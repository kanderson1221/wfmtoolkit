import { mount } from '@vue/test-utils'

import ForecastingWorkspace from '../ForecastingWorkspace.vue'
import ForecastHistoryModal from '../forecasting/ForecastHistoryModal.vue'
import ForecastImportDailyModal from '../forecasting/ForecastImportDailyModal.vue'
import ForecastMonthlyEntryModal from '../forecasting/ForecastMonthlyEntryModal.vue'
import ForecastDailyChart from '../forecasting/ForecastDailyChart.vue'
import ForecastingWorkbench from '../forecasting/ForecastingWorkbench.vue'
import AppFileDropzone from '../ui/AppFileDropzone.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppTableNumberField from '../ui/AppTableNumberField.vue'
import { buildForecastRunInputSignature } from '../../composables/forecasting/forecastWorkspaceHelpers'
import { createForecastProject } from '../../forecasting/shared'
import { forecastingRepository } from '../../forecastingRepository'
import { BrowserStorageError } from '../../storage/browserStorage'
import { clearLocalDataStore } from '../../storage/localDataStore'

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => window.setTimeout(resolve, 0))
}

const flushUi = async () => {
  await flushPromises()
  await flushPromises()
}

const mountedWrappers = []

const findButtonByText = (wrapper, label, { last = false } = {}) => {
  const matches = wrapper.findAll('button').filter((button) => button.text().includes(label))
  if (!matches.length) {
    throw new Error(`Unable to find button "${label}"`)
  }

  return last ? matches[matches.length - 1] : matches[0]
}

const findBodyButtonByText = (label, { last = false } = {}) => {
  const matches = [...document.body.querySelectorAll('button')].filter(
    (button) => button.textContent?.trim() === label
  )

  if (!matches.length) {
    throw new Error(`Unable to find body button "${label}"`)
  }

  return matches[last ? matches.length - 1 : 0]
}

const clickBodyButton = async (label, options) => {
  findBodyButtonByText(label, options).dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushUi()
}

const createLoadedProject = (fileName = 'history.csv') => createForecastProject({
  uploadedFileName: fileName,
  uploadedHeaders: ['service_date', 'call_volume'],
  uploadedRows: [
    { service_date: '2025-01-01', call_volume: '820' },
    { service_date: '2025-01-02', call_volume: '910' },
    { service_date: '2025-01-03', call_volume: '965' },
    { service_date: '2025-01-04', call_volume: '640' },
    { service_date: '2025-01-05', call_volume: '590' },
    { service_date: '2025-01-06', call_volume: '905' },
    { service_date: '2025-01-07', call_volume: '930' },
    { service_date: '2025-01-08', call_volume: '890' },
    { service_date: '2025-01-09', call_volume: '940' },
    { service_date: '2025-01-10', call_volume: '975' },
    { service_date: '2025-01-11', call_volume: '660' },
    { service_date: '2025-01-12', call_volume: '615' },
    { service_date: '2025-01-13', call_volume: '930' },
    { service_date: '2025-01-14', call_volume: '955' }
  ],
  historyRows: [
    { ds: '2025-01-01', y: 820, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-02', y: 910, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-03', y: 965, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-04', y: 640, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-05', y: 590, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-06', y: 905, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-07', y: 930, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-08', y: 890, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-09', y: 940, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-10', y: 975, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-11', y: 660, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-12', y: 615, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-13', y: 930, cap: null, floor: null, holidayLabel: '' },
    { ds: '2025-01-14', y: 955, cap: null, floor: null, holidayLabel: '' }
  ],
  ahtHistoryRows: [
    { ds: '2025-01-01', contacts: 820, ahtSeconds: 280 },
    { ds: '2025-01-02', contacts: 910, ahtSeconds: 282 },
    { ds: '2025-01-03', contacts: 965, ahtSeconds: 285 },
    { ds: '2025-01-04', contacts: 640, ahtSeconds: 295 },
    { ds: '2025-01-05', contacts: 590, ahtSeconds: 294 },
    { ds: '2025-01-06', contacts: 905, ahtSeconds: 281 },
    { ds: '2025-01-07', contacts: 930, ahtSeconds: 283 },
    { ds: '2025-01-08', contacts: 890, ahtSeconds: 279 },
    { ds: '2025-01-09', contacts: 940, ahtSeconds: 286 },
    { ds: '2025-01-10', contacts: 975, ahtSeconds: 288 },
    { ds: '2025-01-11', contacts: 660, ahtSeconds: 296 },
    { ds: '2025-01-12', contacts: 615, ahtSeconds: 297 },
    { ds: '2025-01-13', contacts: 930, ahtSeconds: 284 },
    { ds: '2025-01-14', contacts: 955, ahtSeconds: 287 }
  ],
  parserIssues: [],
  normalizationIssues: [],
  columnMapping: {
    dateColumn: 'service_date',
    volumeColumn: 'call_volume'
  },
  modelConfig: {
    holdoutDays: 0
  }
})

const createForecastRunResults = () => ({
  runAt: '2026-04-05T14:00:00Z',
  dailyForecast: [
    { ds: '2025-01-01', actualValue: 820, yhat: 820, yhatLower: 780, yhatUpper: 860, isHistory: true },
    { ds: '2026-01-01', actualValue: null, yhat: 1005, yhatLower: 930, yhatUpper: 1085, isHistory: false },
    { ds: '2026-01-02', actualValue: null, yhat: 1025, yhatLower: 950, yhatUpper: 1108, isHistory: false }
  ],
  monthlyRollup: [
    {
      monthStart: '2026-01-01',
      monthLabel: 'Jan 2026',
      contacts: 2030,
      averageDailyVolume: 1015,
      peakDailyVolume: 1025,
      lowerBoundContacts: 1880,
      upperBoundContacts: 2193
    }
  ],
  components: {
    trend: [
      { label: '2025-01-01', value: 820 },
      { label: '2026-01-01', value: 1000 }
    ],
    weekly: [
      { label: 'Mon', value: 10 },
      { label: 'Tue', value: 20 }
    ],
    yearly: [
      { label: 'Jan 01', value: 15 },
      { label: 'Feb 01', value: 25 }
    ],
    holidays: []
  },
  summary: {
    originalObservations: 14,
    observationsUsed: 14,
    historyDateRange: '2025-01-01 to 2025-01-14',
    trainingObservations: 11,
    trainingDateRange: '2025-01-01 to 2025-01-11',
    testObservations: 3,
    testDateRange: '2025-01-12 to 2025-01-14',
    forecastDateRange: '2026-01-01 to 2026-01-02',
    forecastHorizonDays: 365,
    projectedTotalContacts: 2030,
    peakForecastMonthLabel: 'Jan 2026',
    peakForecastMonthContacts: 2030,
    peakForecastDayDate: '2026-01-02',
    peakForecastDayVolume: 1025
  },
  diagnostics: {
    warnings: ['Yearly seasonality is enabled, but the training set contains fewer than 365 daily observations.'],
    validationNotes: ['Built-in US holidays were enabled for this run.'],
    holdout: {
      holdoutDays: 3,
      trainingRows: 11,
      testRows: 3,
      trainingDateRange: '2025-01-01 to 2025-01-11',
      testDateRange: '2025-01-12 to 2025-01-14',
      mae: 42.1,
      rmse: 48.2,
      mape: 5.8,
      wape: 5.2,
      bias: -4.1,
      meanActual: 1010.4,
      meanForecast: 1006.3,
      intervalCoverage: 66.7,
      intervalWidthPercent: 80,
      benchmark: {
        id: 'weekday_average_8',
        label: '8-week weekday average',
        description: 'Mean of up to the latest eight matching weekdays in the training set',
        mae: 57.4,
        rmse: 63.2,
        mape: 7.1,
        wape: 7.4,
        bias: 18.7,
        meanForecast: 1029.1
      },
      comparison: {
        lowerWape: 'model',
        wapeDeltaPoints: -2.2
      },
      rollingOrigin: {
        maxFolds: 3,
        foldCount: 2,
        holdoutDaysPerFold: 3,
        totalTestRows: 6,
        folds: [
          {
            foldNumber: 1,
            trainingRows: 8,
            trainingDateRange: '2025-01-01 to 2025-01-08',
            testRows: 3,
            testDateRange: '2025-01-09 to 2025-01-11',
            wape: 8.1,
            mae: 61.2,
            bias: 14.3,
            intervalCoverage: 66.7,
            benchmarkWape: 7.9,
            benchmarkMae: 59.8,
            benchmarkBias: 10.2,
            lowerWape: 'benchmark'
          },
          {
            foldNumber: 2,
            trainingRows: 11,
            trainingDateRange: '2025-01-01 to 2025-01-11',
            testRows: 3,
            testDateRange: '2025-01-12 to 2025-01-14',
            wape: 5.2,
            mae: 42.1,
            bias: -4.1,
            intervalCoverage: 66.7,
            benchmarkWape: 7.4,
            benchmarkMae: 57.4,
            benchmarkBias: 18.7,
            lowerWape: 'model'
          }
        ]
      },
      rows: [
        {
          ds: '2025-01-12',
          actualValue: 980,
          forecastValue: 955,
          lowerBound: 910,
          upperBound: 1000,
          absoluteError: 25,
          signedError: -25,
          percentError: 2.6,
          benchmarkValue: 1030,
          benchmarkAbsoluteError: 50,
          benchmarkSignedError: 50,
          withinInterval: true
        }
      ]
    }
  }
})

const buildImportedDailyProject = (overrides = {}) => {
  const dailyForecast = Array.from({ length: 31 }, (_, index) => ({
    ds: `2025-01-${String(index + 1).padStart(2, '0')}`,
    yhat: 100 + index,
    yhatLower: 100 + index,
    yhatUpper: 100 + index,
    ahtSeconds: 300,
    actualValue: null,
    isHistory: false
  }))

  return createForecastProject({
    id: 'forecast-imported-1',
    name: 'Consumer Voice January Forecast',
    sourceKind: 'imported_daily',
    centerId: 'center-1',
    groupId: 'group-1',
    planningYear: 2025,
    coverageStartDate: '2025-01-01',
    coverageEndDate: '2025-01-31',
    planningContext: {
      centerId: 'center-1',
      groupId: 'group-1',
      planningYear: 2025,
      groupName: 'Consumer Voice'
    },
    sourceData: {
      fileName: 'accepted-january.csv',
      headers: ['date', 'forecast', 'aht_seconds'],
      rows: dailyForecast.map((row, index) => ({
        rowIndex: index + 2,
        date: row.ds,
        forecast: String(row.yhat),
        aht_seconds: String(row.ahtSeconds)
      })),
      mapping: {
        dateColumn: 'date',
        forecastColumn: 'forecast',
        ahtColumn: 'aht_seconds'
      },
      issues: []
    },
    modelConfig: {
      ahtMonthOverrides: [{ monthStart: '2025-01-01', ahtSeconds: 300 }]
    },
    lastRun: {
      ...createForecastRunResults(),
      dailyForecast,
      monthlyRollup: [],
      summary: {
        ...createForecastRunResults().summary,
        planningYear: 2025,
        coverageStartDate: '2025-01-01',
        coverageEndDate: '2025-01-31',
        projectedTotalContacts: dailyForecast.reduce((sum, row) => sum + row.yhat, 0),
        planningReady: true
      }
    },
    createdAt: '2026-04-05T14:00:00.000Z',
    updatedAt: '2026-04-05T14:00:00.000Z',
    ...overrides
  })
}

const buildReplacementCsvFile = (fileName = 'replacement-january.csv') => {
  const text = [
    'date,forecast,aht_seconds',
    ...Array.from({ length: 31 }, (_, index) =>
      `2025-01-${String(index + 1).padStart(2, '0')},${200 + index},315`
    )
  ].join('\n')

  return {
    name: fileName,
    type: 'text/csv',
    text: async () => text
  }
}

const buildHistoryImportState = (project) => ({
  uploadedFileName: project.uploadedFileName,
  uploadedHeaders: project.uploadedHeaders,
  parserIssues: project.parserIssues,
  historyRows: project.historyRows,
  normalizationIssues: project.normalizationIssues,
  columnMapping: project.columnMapping
})

const createProjectWithRun = (overrides = {}) => {
  const baseProject = createLoadedProject()
  const project = createForecastProject({
    ...baseProject,
    modelConfig: {
      ...baseProject.modelConfig,
      holdoutDays: 0
    },
    lastRun: createForecastRunResults(),
    ...overrides
  })

  project.lastRun.inputSignature = buildForecastRunInputSignature(project)
  return project
}

describe('ForecastingWorkspace', () => {
  beforeEach(async () => {
    await clearLocalDataStore()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.restoreAllMocks()
  })

  it('shows the sample template download link', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-download-spec'
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    const downloadLinks = [...document.body.querySelectorAll('a')]
    expect(downloadLinks.some((link) => (link.textContent || '').includes('Download Sample Template'))).toBe(true)
    expect(
      downloadLinks.some(
        (link) => link.getAttribute('href') === '/forecasting_daily_volume_sample_2022_2024.csv'
      )
    ).toBe(true)
    expect(downloadLinks.some((link) => link.getAttribute('href') === '/forecasting_daily_volume_template.csv')).toBe(false)
    expect(document.body.textContent || '').toContain('Upload Daily History')
    expect(wrapper.text()).not.toContain('No historical CSV loaded yet.')
    expect(wrapper.text()).not.toContain('Time Zone')
    expect(wrapper.text()).not.toContain('Series')
    expect(wrapper.text()).toContain('Untitled Forecast')
    expect(wrapper.text()).not.toContain('Historical Data')
    expect(wrapper.text()).not.toContain('Review')
  })

  it('opens the history modal from the workbench and shows file summary and mapped columns', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-historical-data-spec',
        projectSeed: createLoadedProject('loaded-history.csv')
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    expect(wrapper.text()).toContain('Data')
    expect(document.body.textContent || '').not.toContain('Upload Daily History')

    await findButtonByText(wrapper, 'Data').trigger('click')
    await flushUi()

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Upload Daily History')
    expect(bodyText).toContain('File Definition')
    expect(bodyText).toContain('Mapped Column')
    expect(bodyText).not.toContain('Field Mapping')
    expect(bodyText).not.toContain('File Summary')
    expect(document.body.querySelector('table')).not.toBeNull()
    expect(document.body.querySelector('#forecast-date-column')).not.toBeNull()
    expect(document.body.querySelector('#forecast-contacts-column')).not.toBeNull()
    expect(document.body.querySelector('#forecast-ceiling-column')).toBeNull()
    expect(document.body.querySelector('#forecast-floor-column')).toBeNull()
  })

  it('automatically runs the forecast after the first successful history load', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createForecastRunResults()
    })

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-auto-run-on-load-spec'
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    const extendedHistoryRows = Array.from({ length: 90 }, (_, index) => {
      const date = new Date(2025, 0, 1 + index)
      const ds = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-')

      return {
        ds,
        y: 800 + (index % 25),
        cap: null,
        floor: null,
        holidayLabel: ''
      }
    })
    const loadedProject = createForecastProject({
      uploadedFileName: 'auto-run-history.csv',
      uploadedHeaders: ['service_date', 'call_volume'],
      uploadedRows: extendedHistoryRows.map((row) => ({
        service_date: row.ds,
        call_volume: String(row.y)
      })),
      historyRows: extendedHistoryRows,
      parserIssues: [],
      normalizationIssues: [],
      columnMapping: {
        dateColumn: 'service_date',
        volumeColumn: 'call_volume'
      }
    })
    await wrapper.findComponent(ForecastHistoryModal).vm.$emit('apply', buildHistoryImportState(loadedProject))
    await flushUi()
    await flushUi()
    await flushUi()

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/forecasting/daily-volume/run',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    )
    expect(wrapper.text()).toContain('Forecasted demand vs historical volume')
    expect(wrapper.text()).toContain('Current run:')
    expect(document.body.textContent || '').not.toContain('Upload Daily History')
  })

  it('emits save-complete after importing a read-only daily forecast', async () => {
    const importedDailyRows = Array.from({ length: 31 }, (_, index) => ({
      ds: `2025-01-${String(index + 1).padStart(2, '0')}`,
      yhat: 1000 + (index * 20),
      yhatLower: 1000 + (index * 20),
      yhatUpper: 1000 + (index * 20),
      ahtSeconds: 300 + (index % 3) * 15,
      actualValue: null,
      isHistory: false
    }))
    const persistWorkspace = vi.spyOn(forecastingRepository, 'persistWorkspace').mockImplementation(
      async (projects) => projects
    )
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-imported-daily-save-spec',
        projectSeed: createForecastProject({
          groupName: 'Consumer Voice',
          planningYear: 2025,
          coverageStartDate: '2025-01-01',
          coverageEndDate: '2025-01-31',
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planningYear: 2025,
            groupName: 'Consumer Voice'
          },
          sourceKind: 'imported_daily'
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    await wrapper.findComponent(ForecastImportDailyModal).vm.$emit('apply', {
      forecastType: 'budget',
      coverageStartMonthIndex: 0,
      sourceData: {
        fileName: 'consumer-voice-2025-forecast.csv',
        headers: ['date', 'forecast', 'aht_seconds'],
        rows: importedDailyRows.map((row, index) => ({
          rowIndex: index + 2,
          date: row.ds,
          forecast: String(row.yhat),
          aht_seconds: String(row.ahtSeconds)
        })),
        mapping: {
          dateColumn: 'date',
          forecastColumn: 'forecast',
          ahtColumn: 'aht_seconds'
        },
        issues: []
      },
      importedDailyRows,
      ahtMonthOverrides: [
        {
          monthStart: '2025-01-01',
          ahtSeconds: 315.1485148514852
        }
      ]
    })
    for (let attempt = 0; attempt < 6 && !wrapper.emitted('save-complete')?.length; attempt += 1) {
      await flushUi()
    }

    expect(wrapper.emitted('save-complete')).toHaveLength(1)
    const savedProjects = persistWorkspace.mock.calls.at(-1)?.[0] || []
    expect(savedProjects[0].modelConfig.ahtMonthOverrides).toEqual([
      {
        monthStart: '2025-01-01',
        ahtSeconds: 315.1485148514852
      }
    ])
  })

  it('previews dependent plan safety and atomically replaces one exact imported forecast', async () => {
    const scope = 'forecast-imported-replacement-spec'
    const originalProject = buildImportedDailyProject()
    await forecastingRepository.persistWorkspace([originalProject], scope)
    const persistWorkspace = vi.spyOn(forecastingRepository, 'persistWorkspace')
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: scope,
        initialProjectId: originalProject.id,
        showSourceActionButton: true,
        replacementDependenciesByProjectId: {
          [originalProject.id]: [
            { id: 'budget-2025', label: '2025 Budget', state: 'draft', isDraft: true },
            { id: 'update-2025', label: 'Spring Update', state: 'finalized', isDraft: false }
          ]
        }
      }
    })
    mountedWrappers.push(wrapper)
    await flushUi()
    await flushUi()

    await findButtonByText(wrapper, 'Replace Data').trigger('click')
    await flushUi()

    const modal = wrapper.findComponent(ForecastImportDailyModal)
    expect(modal.findComponent(AppFileDropzone).props('autofocus')).toBe(true)
    expect(document.body.textContent || '').toContain('Replace Daily Forecast')
    expect(document.body.textContent || '').toContain('accepted-january.csv')
    expect(document.body.textContent || '').toContain('2025 Budget (draft)')
    expect(document.body.textContent || '').toContain('Spring Update (finalized)')
    expect(document.body.textContent || '').toContain('Saved demand values and snapshots remain unchanged')

    await modal.findComponent(AppFileDropzone).vm.$emit('file-select', {
      target: { files: [buildReplacementCsvFile()] }
    })
    await flushUi()

    expect(document.body.textContent || '').toContain('replacement-january.csv')
    expect(document.body.textContent || '').toContain('6,665')
    expect(findBodyButtonByText('Replace Forecast').disabled).toBe(false)

    await clickBodyButton('Replace Forecast')
    await vi.waitFor(() => {
      expect(wrapper.emitted('save-complete')).toHaveLength(1)
    })

    expect(persistWorkspace).toHaveBeenCalledTimes(1)
    const persistedProjects = persistWorkspace.mock.calls[0][0]
    expect(persistedProjects).toHaveLength(1)
    expect(persistedProjects[0].id).toBe(originalProject.id)
    expect(persistedProjects[0].sourceData.fileName).toBe('replacement-january.csv')
  })

  it('keeps the accepted forecast and parsed replacement available when atomic persistence fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const scope = 'forecast-imported-replacement-failure-spec'
    const originalProject = buildImportedDailyProject()
    await forecastingRepository.persistWorkspace([originalProject], scope)
    vi.spyOn(forecastingRepository, 'persistWorkspace').mockRejectedValue(
      new BrowserStorageError('Local storage is full.', {
        code: 'storage_quota_exceeded',
        storageKey: scope
      })
    )
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: scope,
        initialProjectId: originalProject.id,
        showSourceActionButton: true
      }
    })
    mountedWrappers.push(wrapper)
    await flushUi()
    await flushUi()

    await findButtonByText(wrapper, 'Replace Data').trigger('click')
    const modal = wrapper.findComponent(ForecastImportDailyModal)
    await modal.findComponent(AppFileDropzone).vm.$emit('file-select', {
      target: { files: [buildReplacementCsvFile('retry-replacement.csv')] }
    })
    await flushUi()
    await clickBodyButton('Replace Forecast')
    await flushUi()

    expect(wrapper.vm.currentProject.sourceData.fileName).toBe('accepted-january.csv')
    expect(document.body.textContent || '').toContain('retry-replacement.csv')
    expect(document.body.textContent || '').toContain('Unable to save the forecast.')
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    const storedProjects = await forecastingRepository.loadWorkspace(scope)
    expect(storedProjects).toHaveLength(1)
    expect(storedProjects[0].sourceData.fileName).toBe('accepted-january.csv')
    expect(wrapper.emitted('save-complete')).toBeUndefined()
  })

  it('emits cancel-create when a new manual monthly forecast is cancelled before save', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-manual-monthly-cancel-spec',
        projectSeed: createForecastProject({
          groupName: 'Consumer Voice',
          planningYear: 2025,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planningYear: 2025,
            groupName: 'Consumer Voice'
          },
          sourceKind: 'manual_monthly'
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    await wrapper.findComponent(ForecastMonthlyEntryModal).vm.$emit('close')
    await flushUi()

    expect(wrapper.emitted('cancel-create')).toHaveLength(1)
  })

  it('emits cancel-create when a new modeled forecast history upload is cancelled before load', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-modeled-cancel-spec',
        projectSeed: createForecastProject({
          groupName: 'Consumer Voice',
          planningYear: 2025,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planningYear: 2025,
            groupName: 'Consumer Voice'
          },
          sourceKind: 'modeled_daily'
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    await wrapper.findComponent(ForecastHistoryModal).vm.$emit('close')
    await flushUi()

    expect(wrapper.emitted('cancel-create')).toHaveLength(1)
  })

  it('can hide the duplicate action in the workspace header', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-hide-duplicate-spec',
        showDuplicateAction: false
      }
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).not.toContain('Duplicate Forecast')
    expect(wrapper.text()).toContain('Save Forecast')
  })

  it('shows a close action when no saved projects exist', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-empty-projects-spec',
        projectSeed: {
          groupName: 'Consumer Voice',
          planningYear: 2026
        }
      }
    })
    mountedWrappers.push(wrapper)

    await findButtonByText(wrapper, 'Open Forecast').trigger('click')
    await flushUi()

    expect(document.body.textContent || '').toContain('No saved forecasts')
    expect(findBodyButtonByText('Close')).toBeTruthy()
  })

  it('opens saved forecast comparison when two scored model candidates are available', async () => {
    const scope = 'forecast-candidate-comparison-spec'
    const reference = createProjectWithRun({
      id: 'reference-forecast',
      name: 'Reference Forecast',
      createdAt: '2026-07-18T12:00:00.000Z',
      updatedAt: '2026-07-18T12:00:00.000Z'
    })
    const candidate = createProjectWithRun({
      id: 'candidate-forecast',
      name: 'Candidate Forecast',
      modelConfig: {
        ...reference.modelConfig,
        growth: 'flat'
      },
      lastRun: {
        ...createForecastRunResults(),
        diagnostics: {
          ...createForecastRunResults().diagnostics,
          holdout: {
            ...createForecastRunResults().diagnostics.holdout,
            wape: 4.1
          }
        }
      },
      createdAt: '2026-07-19T12:00:00.000Z',
      updatedAt: '2026-07-19T12:00:00.000Z'
    })
    await forecastingRepository.persistWorkspace([reference, candidate], scope)

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: scope,
        initialProjectId: reference.id,
        showLibraryActions: false
      }
    })
    mountedWrappers.push(wrapper)
    await flushUi()
    await flushUi()

    await findButtonByText(wrapper, 'Compare Forecasts').trigger('click')
    await flushUi()

    expect(document.body.textContent || '').toContain('Compare Saved Forecasts')
    expect(document.body.textContent || '').toContain('Identical dated actual contacts verified.')
    expect(document.body.textContent || '').toContain('Candidate Forecast has 1.1 percentage points lower WAPE')
  })

  it('shows a device-based error message when saved forecasts cannot be read locally', async () => {
    vi.spyOn(forecastingRepository, 'loadWorkspaceResult').mockResolvedValue({
      projects: [],
      error: new Error('blocked')
    })

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-read-error-spec'
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()

    expect(wrapper.text()).toContain('Unable to read saved forecasts from this device.')
  })

  it('omits the holidays inspector section for call-center-managed forecasts', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-center-holiday-spec',
        projectSeed: {
          ...createLoadedProject(),
          centerManagedHolidays: true,
          sourceCenterSnapshot: {
            centerId: 'center-1',
            centerName: 'North America Operations',
            holidayCalendarLabel: 'United States Federal'
          },
          modelConfig: {
            builtInHolidayCountry: 'US',
            customHolidays: [
              {
                id: 'company-day',
                name: 'Company Day',
                date: '2026-12-26',
                lowerWindow: 0,
                upperWindow: 0,
                priorScale: 10
              }
            ]
          }
        }
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()
    await flushUi()

    await wrapper.find('button[aria-label="Expand model parameters"]').trigger('click')
    await flushUi()

    const bodyText = document.body.textContent || ''
    expect(bodyText).not.toContain('Holiday Effects')
    expect(document.body.querySelector('#forecast-holiday-country')).toBeNull()
    expect(bodyText).not.toContain('Custom holidays are managed at the call center level.')
  })

  it('uploads daily history, runs the forecast, and shows the monthly rollup', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createForecastRunResults()
    })

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-run-spec',
        projectSeed: {
          ...createLoadedProject(),
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        }
      }
    })
    mountedWrappers.push(wrapper)
    await flushUi()
    await flushUi()
    await flushUi()

    await wrapper.findComponent(ForecastingWorkbench).vm.$emit('run-forecast')
    await flushUi()

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/forecasting/daily-volume/run',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    )
    const savedProjects = await forecastingRepository.loadWorkspace('forecast-run-spec')
    expect(savedProjects[0].uploadedFileName).toBe('history.csv')
    expect(savedProjects[0].name).toBe('Consumer Voice 2026 Demand Forecast')
    expect(wrapper.text()).toContain('Consumer Voice 2026 Demand Forecast')
    expect(wrapper.text()).toContain('Forecasted demand vs historical volume')
    expect(wrapper.text()).toContain('Test period')
    expect(wrapper.text()).toContain('Forecast accuracy review')
    expect(wrapper.text()).toContain('Range adjustment rules')
    expect(wrapper.text().indexOf('Range adjustment rules')).toBeLessThan(
      wrapper.text().indexOf('Forecast accuracy review')
    )
    expect(wrapper.text()).toContain('8-week weekday average')
    expect(wrapper.text()).toContain('2.2 percentage points lower WAPE')
    expect(wrapper.text()).toContain('Download Accuracy CSV')
    expect(wrapper.text()).toContain('Accuracy across historical cutoffs')
    expect(wrapper.text()).toContain('Download Stability CSV')
    expect(wrapper.text()).not.toContain('Forecast saved.')

    await findButtonByText(wrapper, 'Monthly Rollup').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Monthly Rollup')
    expect(wrapper.text()).toContain('Jan 2026')
    expect(wrapper.text()).toContain('Jan 2, 2026')
    expect(wrapper.text()).toContain('1,025')
  })

  it('uses held-out forecast rows in the chart when showing MAPE-scored test days', async () => {
    const loadedProject = createLoadedProject()
    const historyForecastRows = loadedProject.historyRows.map((row) => ({
      ds: row.ds,
      actualValue: row.y,
      yhat: row.y,
      yhatLower: row.y - 25,
      yhatUpper: row.y + 25,
      isHistory: true
    }))

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-holdout-chart-spec',
        projectSeed: {
          ...loadedProject,
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          },
          lastRun: {
            ...createForecastRunResults(),
            dailyForecast: [
              ...historyForecastRows,
              { ds: '2026-01-01', actualValue: null, yhat: 1005, yhatLower: 930, yhatUpper: 1085, isHistory: false }
            ],
            diagnostics: {
              ...createForecastRunResults().diagnostics,
              holdout: {
                ...createForecastRunResults().diagnostics.holdout,
                holdoutDays: 3,
                rows: [
                  {
                    ds: '2025-01-12',
                    actualValue: 615,
                    forecastValue: 720,
                    lowerBound: 680,
                    upperBound: 760,
                    absoluteError: 105,
                    signedError: 105,
                    percentError: 17.1,
                    withinInterval: false
                  }
                ]
              }
            }
          }
        }
      }
    })
    mountedWrappers.push(wrapper)
    await flushUi()
    await flushUi()

    const chartRows = wrapper.findComponent(ForecastDailyChart).props('rows')
    const heldOutRow = chartRows.find((row) => row.ds === '2025-01-12')

    expect(heldOutRow.actualValue).toBe(615)
    expect(heldOutRow.yhat).toBe(720)
    expect(heldOutRow.yhatLower).toBe(680)
    expect(heldOutRow.yhatUpper).toBe(760)
  })

  it('saves a project and reopens it from the project dialog', async () => {
    const initialWrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-save-spec',
        projectSeed: {
          ...createLoadedProject('saved-history.csv'),
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        }
      }
    })
    mountedWrappers.push(initialWrapper)
    await flushUi()
    await flushUi()

    await findButtonByText(initialWrapper, 'Save Forecast').trigger('click')
    await flushUi()

    const savedProjects = await forecastingRepository.loadWorkspace('forecast-save-spec')
    expect(savedProjects[0].uploadedFileName).toBe('saved-history.csv')
    expect(savedProjects[0].name).toBe('Consumer Voice 2026 Demand Forecast')
    expect(initialWrapper.text()).not.toContain('Forecast saved.')

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-save-spec'
      }
    })
    mountedWrappers.push(wrapper)
    await flushUi()
    await flushUi()
    expect(document.body.textContent || '').toContain('Upload Daily History')
    expect(wrapper.text()).not.toContain('No historical CSV loaded yet.')

    await findButtonByText(wrapper, 'Open Forecast').trigger('click')
    await flushUi()
    expect(document.body.textContent || '').toContain('Open Forecast')

    await clickBodyButton('Open Forecast', { last: true })

    expect(wrapper.text()).toContain('Consumer Voice 2026 Demand Forecast')
    expect(wrapper.text()).toContain('Data')
    expect(document.body.textContent || '').not.toContain('No file loaded')
  })

  it('opens the requested saved forecast when an initial project id is provided', async () => {
    const sharedPlanningContext = {
      centerId: 'center-1',
      groupId: 'group-1',
      planId: null,
      planningYear: 2026,
      groupName: 'Consumer Voice'
    }
    const firstProject = {
      ...createLoadedProject('first-history.csv'),
      groupName: 'Consumer Voice',
      planningYear: 2026,
      planningContext: sharedPlanningContext
    }
    const secondProject = {
      ...createLoadedProject('second-history.csv'),
      groupName: 'Consumer Voice',
      planningYear: 2026,
      planningContext: sharedPlanningContext
    }

    await forecastingRepository.persistWorkspace(
      [
        {
          ...firstProject,
          id: 'forecast-1',
          name: 'Consumer Voice 2026 Demand Forecast'
        },
        {
          ...secondProject,
          id: 'forecast-2',
          name: 'Consumer Voice 2026 Reforecast (Apr)',
          forecastType: 'budget'
        }
      ],
      'forecast-initial-project-spec'
    )

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-initial-project-spec',
        initialProjectId: 'forecast-2'
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    expect(wrapper.text()).toContain('Consumer Voice 2026 Demand Forecast 2')
    expect(wrapper.text()).toContain('Data')
    expect(wrapper.find('button[aria-label="Expand model parameters"]').exists()).toBe(true)
    expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Run')).toBe(false)
  })

  it('opens model parameters by default for a new planning forecast seeded from shared history', async () => {
    const sharedHistorySeed = createLoadedProject('shared-history.csv')
    const sharedHistoryProject = createForecastProject({
      groupName: 'Consumer Voice',
      planningYear: 2026,
      planningContext: {
        centerId: 'center-1',
        groupId: 'group-1',
        planId: null,
        planningYear: 2026,
        groupName: 'Consumer Voice'
      },
      uploadedFileName: '',
      uploadedHeaders: [],
      uploadedRows: [],
      historyRows: sharedHistorySeed.historyRows,
      ahtHistoryRows: sharedHistorySeed.ahtHistoryRows,
      parserIssues: [],
      normalizationIssues: []
    })

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-planning-seeded-inspector-spec',
        projectSeed: sharedHistoryProject
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    expect(wrapper.find('button[aria-label="Expand model parameters"]').exists()).toBe(false)
    expect(document.body.textContent || '').toContain('Model Parameters')
    expect(document.body.textContent || '').toContain('Training Data')
    expect(document.body.textContent || '').toContain('Source: Shared staffing-group history')
    expect(document.body.textContent || '').toContain('Handle Time Assumptions')
    expect(document.body.textContent || '').toContain('Validation')
    expect(document.body.querySelector('#forecast-training-start-date')?.value).toBe('2025-01-01')
    expect(document.body.querySelector('#forecast-training-end-date')?.value).toBe('2025-01-14')
  })

  it('keeps model parameters collapsed when reopening a saved forecast without prior results', async () => {
    await forecastingRepository.persistWorkspace(
      [
        createForecastProject({
          ...createLoadedProject('saved-history.csv'),
          id: 'saved-forecast',
          name: 'Consumer Voice 2026 Demand Forecast',
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: null,
            planningYear: 2026,
            groupName: 'Consumer Voice'
          },
          createdAt: '2026-04-19T09:00:00.000Z',
          updatedAt: '2026-04-19T09:00:00.000Z'
        })
      ],
      'forecast-reopen-no-run-inspector-spec'
    )

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-reopen-no-run-inspector-spec',
        initialProjectId: 'saved-forecast'
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    expect(wrapper.find('button[aria-label="Expand model parameters"]').exists()).toBe(true)
  })

  it('opens forecasts with prior results directly in the workbench and shows the docked worksheet', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-workbench-default-spec',
        projectSeed: createProjectWithRun({
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    expect(wrapper.text()).toContain('Consumer Voice 2026 Demand Forecast')
    expect(wrapper.text()).not.toContain('Plan Year')
    expect(wrapper.text()).not.toContain('Forecast Type')
    expect(wrapper.text()).toContain('Range adjustment rules')
    expect(wrapper.find('button[aria-label="Expand model parameters"]').exists()).toBe(true)

    await wrapper.find('button[aria-label="Expand model parameters"]').trigger('click')
    await flushUi()

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Training Data')
    expect(bodyText).toContain('Handle Time Assumptions')
    expect(bodyText).toContain('Validation')
    expect(bodyText).toContain('Confidence')
    expect(bodyText).toContain('Weekly')
    expect(document.body.querySelector('#forecast-monthly-toggle')).not.toBeNull()
    expect(bodyText).toContain('Yearly')
    expect(bodyText).not.toContain('Data Prep')
    expect(bodyText).not.toContain('Weekly Detail')
    expect(bodyText).not.toContain('Weekly Strength')
    expect(bodyText).not.toContain('Yearly Detail')
    expect(bodyText).not.toContain('Yearly Strength')
    expect(bodyText).not.toContain('Confidence Band')
    expect(bodyText).not.toContain('Uses the default Prophet weekly seasonality settings.')
    expect(bodyText).not.toContain('Uses the default Prophet yearly seasonality settings.')
    expect(document.body.querySelector('[aria-label="Explain Test Set Days"]')).not.toBeNull()
    expect(document.body.querySelector('[aria-label="Explain Weekly"]')).not.toBeNull()
    expect(document.body.querySelector('[aria-label="Explain Trend Type"]')).not.toBeNull()
  })

  it('shows a clear validation message when loaded history is too old for the forecast year', async () => {
    const staleHistoryRows = Array.from({ length: 14 }, (_, index) => {
      const day = index + 18
      return {
        ds: `2024-12-${String(day).padStart(2, '0')}`,
        y: 800 + index,
        cap: null,
        floor: null,
        holidayLabel: ''
      }
    })

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-history-gap-validation-spec',
        projectSeed: createForecastProject({
          groupName: 'Consumer Voice',
          planningYear: 2027,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2027,
            groupName: 'Consumer Voice'
          },
          uploadedFileName: 'forecasting_daily_volume_sample_2022_2024.csv',
          uploadedHeaders: ['service_date', 'call_volume'],
          uploadedRows: staleHistoryRows.map((row) => ({
            service_date: row.ds,
            call_volume: String(row.y)
          })),
          historyRows: staleHistoryRows,
          columnMapping: {
            dateColumn: 'service_date',
            volumeColumn: 'call_volume'
          }
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    await wrapper.find('button[aria-label="Expand model parameters"]').trigger('click')
    await flushUi()

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Loaded history ends Dec 31, 2024.')
    expect(bodyText).toContain('would require 1,095 forecast days')
    expect(bodyText).toContain('maximum supported horizon is 730 days')
    expect(bodyText).toContain('Load more recent history or choose an earlier forecast year.')
  })

  it('shows manual adjustments only on the forecast tab', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-adjustments-rail-spec',
        projectSeed: createProjectWithRun({
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    const hasWorkbenchButton = (label) =>
      [...wrapper.findAll('button')].some((button) => button.text().trim() === label)
    const hasBodyButton = (label) =>
      [...document.body.querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === label
      )

    expect(wrapper.text()).toContain('Range adjustment rules')
    expect(wrapper.find('button[aria-label="Collapse manual adjustments dock"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Expand manual adjustments dock"]').exists()).toBe(false)
    expect(hasWorkbenchButton('Data')).toBe(true)
    expect(hasWorkbenchButton('Run')).toBe(false)

    expect(wrapper.text()).toContain('Forecast')
    expect(wrapper.text()).toContain('Components')

    await findButtonByText(wrapper, 'AHT').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Monthly Handle Time Assumptions')
    expect(wrapper.text()).not.toContain('Range adjustment rules')
    expect(hasWorkbenchButton('Data')).toBe(false)
    expect(hasWorkbenchButton('Run')).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Components')).toBe(false)

    await findButtonByText(wrapper, 'Contacts').trigger('click')
    await flushUi()

    await findButtonByText(wrapper, 'Components').trigger('click')
    await flushUi()

    expect(wrapper.text()).not.toContain('Range adjustment rules')
    expect(hasWorkbenchButton('Data')).toBe(false)
    expect(hasWorkbenchButton('Run')).toBe(false)

    await wrapper.find('button[aria-label="Expand model parameters"]').trigger('click')
    await flushUi()

    expect(hasBodyButton('Run')).toBe(true)

    await clickBodyButton('Close')

    await findButtonByText(wrapper, 'Monthly Rollup').trigger('click')
    await flushUi()

    expect(wrapper.text()).not.toContain('Range adjustment rules')
    expect(hasWorkbenchButton('Data')).toBe(false)
    expect(hasWorkbenchButton('Run')).toBe(false)
  })

  it('lets users review and override monthly AHT assumptions', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-aht-tab-spec',
        projectSeed: createProjectWithRun({
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    await findButtonByText(wrapper, 'AHT').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Monthly Handle Time Assumptions')
    expect(wrapper.text()).toContain('Monthly AHT Review')
    expect(wrapper.text()).toContain('Blend Recent + Seasonal')

    const overrideField = wrapper.findAllComponents(AppTableNumberField)[0]
    expect(overrideField.exists()).toBe(true)

    await overrideField.vm.$emit('update:modelValue', 415)
    await flushUi()

    expect(wrapper.text()).toContain('415.0 sec')
    expect(wrapper.text()).toContain('Clear AHT Overrides')

    await findButtonByText(wrapper, 'Monthly Rollup').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('415.0 sec')
  })

  it('shows a single footer close action and keeps run visible when the inspector opens from AHT', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-aht-inspector-actions-spec',
        projectSeed: createProjectWithRun({
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    await findButtonByText(wrapper, 'AHT').trigger('click')
    await flushUi()

    await wrapper.find('button[aria-label="Expand model parameters"]').trigger('click')
    await flushUi()

    const closeButtons = [...document.body.querySelectorAll('button')].filter(
      (button) => button.textContent?.trim() === 'Close'
    )
    const runButtons = [...document.body.querySelectorAll('button')].filter(
      (button) => button.textContent?.trim() === 'Run'
    )

    expect(closeButtons).toHaveLength(1)
    expect(runButtons).toHaveLength(1)
    expect(document.body.textContent || '').not.toContain('Settings are current for the latest completed run.')
  })

  it('shows a monthly component card when monthly seasonality is enabled', async () => {
    const runResults = createForecastRunResults()
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-monthly-component-spec',
        projectSeed: createProjectWithRun({
          modelConfig: {
            monthlySeasonalityEnabled: true
          },
          lastRun: {
            ...runResults,
            components: {
              ...runResults.components,
              monthly: [
                { label: 'Jan 01', value: 0 },
                { label: 'Jan 02', value: 0 }
              ]
            }
          },
          name: 'Consumer Voice 2026 Demand Forecast'
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    await findButtonByText(wrapper, 'Components').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Monthly Seasonality')
  })

  it('adds adjustment rules to the list and supports editing and removing them', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-adjustment-rules-spec',
        projectSeed: createProjectWithRun({
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    await wrapper.findComponent(AppNumberField).vm.$emit('update:modelValue', 125)
    await flushUi()

    expect(wrapper.text()).toContain('Enter the planning reason for this adjustment.')
    expect(findButtonByText(wrapper, 'Add').attributes('disabled')).toBeDefined()

    await wrapper.find('#forecast-adjustment-reason').setValue('Approved product launch')
    await flushUi()

    await findButtonByText(wrapper, 'Add').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Edit')
    expect(wrapper.text()).toContain('Remove')
    expect(wrapper.text()).toContain('+125')
    expect(wrapper.text()).toContain('Approved product launch')

    await findButtonByText(wrapper, 'Edit').trigger('click')
    await flushUi()

    await wrapper.findComponent(AppNumberField).vm.$emit('update:modelValue', 150)
    await wrapper.find('#forecast-adjustment-reason').setValue('Launch estimate approved by Commercial Planning')
    await flushUi()

    await findButtonByText(wrapper, 'Save', { last: true }).trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('+150')
    expect(wrapper.text()).not.toContain('+125')
    expect(wrapper.text()).toContain('Launch estimate approved by Commercial Planning')
    expect(wrapper.text()).not.toContain('Approved product launch')
    expect(wrapper.text()).toContain('Add')
    expect(
      [...wrapper.findAll('button')].some((button) => button.text().trim() === 'Save')
    ).toBe(false)

    await findButtonByText(wrapper, 'Monthly Rollup').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Baseline Contacts')
    expect(wrapper.text()).toContain('Manual Change')
    expect(wrapper.text()).toContain('Final Contacts')
    expect(wrapper.text()).toContain('2,030')
    expect(wrapper.text()).toContain('+150')
    expect(wrapper.text()).toContain('2,180')

    await findButtonByText(wrapper, 'Contacts').trigger('click')
    await flushUi()

    await findButtonByText(wrapper, 'Remove').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('No adjustment rules yet')
  })

  it('preserves legacy adjustment rules without inventing a decision reason', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-legacy-adjustment-reason-spec',
        projectSeed: createProjectWithRun({
          manualAdjustments: [
            {
              id: 'legacy-rule',
              startDate: '2026-01-01',
              endDate: '2026-01-01',
              adjustmentType: 'delta',
              value: 75
            }
          ]
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    expect(wrapper.text()).toContain('1 saved rule has no recorded reason')
    expect(wrapper.text()).toContain('Not recorded (legacy rule)')

    await findButtonByText(wrapper, 'Edit').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Enter the planning reason for this adjustment.')
    expect(findButtonByText(wrapper, 'Save', { last: true }).attributes('disabled')).toBeDefined()
  })

  it('moves the rerun action into the inspector drawer while settings are open', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createForecastRunResults()
    })

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-inspector-run-action-spec',
        projectSeed: createProjectWithRun({
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    expect(
      [...wrapper.findAll('button')].some((button) => button.text().trim() === 'Run')
    ).toBe(false)

    await wrapper.find('button[aria-label="Expand model parameters"]').trigger('click')
    await flushUi()

    expect(
      [...wrapper.findAll('button')].some((button) => button.text().trim() === 'Run')
    ).toBe(false)
    expect(document.body.textContent || '').toContain('Run')
    expect(document.body.textContent || '').not.toContain('Settings are current for the latest completed run.')

    await clickBodyButton('Run', { last: true })
    await flushUi()
    await flushUi()

    expect(
      [...wrapper.findAll('button')].some((button) => button.text().trim() === 'Run')
    ).toBe(false)
  })

  it('marks workbench results stale when settings change and reruns only on explicit action', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createForecastRunResults()
    })

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-stale-run-spec',
        projectSeed: createProjectWithRun({
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        })
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    expect(wrapper.text()).not.toContain('Outputs Stale')

    wrapper.vm.currentProject.modelConfig.intervalWidth = 0.9
    await flushUi()

    expect(wrapper.text()).toContain('Outputs Stale')
    expect(global.fetch).not.toHaveBeenCalled()

    await wrapper.find('button[aria-label="Expand model parameters"]').trigger('click')
    await flushUi()

    await clickBodyButton('Run', { last: true })
    await flushUi()
    await flushUi()
    await flushUi()
    await flushUi()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Outputs Stale')
    expect(wrapper.text()).not.toContain('Forecast saved.')
  })

  it('shows a browser storage error when saving the forecast fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(forecastingRepository, 'persistWorkspace').mockRejectedValue(
      new BrowserStorageError('Local storage is full.', {
        code: 'storage_quota_exceeded',
        storageKey: 'wfmtoolkit.forecastProjects.v1.forecast-save-error-spec'
      })
    )

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-save-error-spec',
        projectSeed: {
          ...createLoadedProject('quota-history.csv'),
          groupName: 'Consumer Voice',
          planningYear: 2026,
          planningContext: {
            centerId: 'center-1',
            groupId: 'group-1',
            planId: 'plan-1',
            planningYear: 2026,
            groupName: 'Consumer Voice'
          }
        }
      }
    })
    mountedWrappers.push(wrapper)
    await flushUi()
    await flushUi()

    await findButtonByText(wrapper, 'Save Forecast').trigger('click')
    await flushUi()
    await flushUi()

    expect(wrapper.text()).toContain('Unable to save the forecast.')
    expect(wrapper.text()).toContain('out of local data storage space')
  })
})
