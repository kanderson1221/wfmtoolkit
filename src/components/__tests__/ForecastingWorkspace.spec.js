import { mount } from '@vue/test-utils'

import ForecastingWorkspace from '../ForecastingWorkspace.vue'
import ForecastHistoryModal from '../forecasting/ForecastHistoryModal.vue'
import ForecastImportDailyModal from '../forecasting/ForecastImportDailyModal.vue'
import ForecastMonthlyEntryModal from '../forecasting/ForecastMonthlyEntryModal.vue'
import ForecastingWorkbench from '../forecasting/ForecastingWorkbench.vue'
import AppNumberField from '../ui/AppNumberField.vue'
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
          withinInterval: true
        }
      ]
    }
  }
})

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
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-imported-daily-save-spec',
        projectSeed: createForecastProject({
          groupName: 'Consumer Voice',
          planningYear: 2025,
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
        headers: ['date', 'forecast'],
        rows: [
          { rowIndex: 2, date: '2025-01-01', forecast: '1000' },
          { rowIndex: 3, date: '2025-01-02', forecast: '1020' }
        ],
        mapping: {
          dateColumn: 'date',
          forecastColumn: 'forecast'
        },
        issues: []
      },
      importedDailyRows: [
        { ds: '2025-01-01', yhat: 1000, yhatLower: 1000, yhatUpper: 1000, actualValue: null, isHistory: false },
        { ds: '2025-01-02', yhat: 1020, yhatLower: 1020, yhatUpper: 1020, actualValue: null, isHistory: false }
      ]
    })
    for (let attempt = 0; attempt < 6 && !wrapper.emitted('save-complete')?.length; attempt += 1) {
      await flushUi()
    }

    expect(wrapper.emitted('save-complete')).toHaveLength(1)
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
    expect(savedProjects[0].name).toBe('Consumer Voice 2026 Budget Forecast')
    expect(wrapper.text()).toContain('Consumer Voice 2026 Budget Forecast')
    expect(wrapper.text()).toContain('Forecasted demand vs historical volume')
    expect(wrapper.text()).toContain('Test period')
    expect(wrapper.text()).toContain('MAPE')
    expect(wrapper.text()).not.toContain('Accuracy')
    expect(wrapper.text()).not.toContain('Forecast saved.')

    await findButtonByText(wrapper, 'Monthly Rollup').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Monthly Rollup')
    expect(wrapper.text()).toContain('Jan 2026')
    expect(wrapper.text()).toContain('Jan 2, 2026')
    expect(wrapper.text()).toContain('1,025')
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
    expect(savedProjects[0].name).toBe('Consumer Voice 2026 Budget Forecast')
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

    expect(wrapper.text()).toContain('Consumer Voice 2026 Budget Forecast')
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
          name: 'Consumer Voice 2026 Budget Forecast'
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

    expect(wrapper.text()).toContain('Consumer Voice 2026 Budget Forecast 2')
    expect(wrapper.text()).toContain('Data')
    expect(wrapper.find('button[aria-label="Expand model parameters"]').exists()).toBe(true)
    expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Run')).toBe(false)
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

    expect(wrapper.text()).toContain('Consumer Voice 2026 Budget Forecast')
    expect(wrapper.text()).not.toContain('Plan Year')
    expect(wrapper.text()).not.toContain('Forecast Type')
    expect(wrapper.text()).toContain('Range adjustment rules')
    expect(wrapper.find('button[aria-label="Expand model parameters"]').exists()).toBe(true)

    await wrapper.find('button[aria-label="Expand model parameters"]').trigger('click')
    await flushUi()

    const bodyText = document.body.textContent || ''
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

    await findButtonByText(wrapper, 'Components').trigger('click')
    await flushUi()

    expect(wrapper.text()).not.toContain('Range adjustment rules')
    expect(hasWorkbenchButton('Data')).toBe(false)
    expect(hasWorkbenchButton('Run')).toBe(false)

    await wrapper.find('button[aria-label="Expand model parameters"]').trigger('click')
    await flushUi()

    expect(hasBodyButton('Run')).toBe(false)

    await clickBodyButton('Close')

    await findButtonByText(wrapper, 'Monthly Rollup').trigger('click')
    await flushUi()

    expect(wrapper.text()).not.toContain('Range adjustment rules')
    expect(hasWorkbenchButton('Data')).toBe(false)
    expect(hasWorkbenchButton('Run')).toBe(false)

    await findButtonByText(wrapper, 'Forecast').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Range adjustment rules')
    expect(hasWorkbenchButton('Data')).toBe(true)
    expect(hasWorkbenchButton('Run')).toBe(false)
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
          name: 'Consumer Voice 2026 Budget Forecast'
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

    await findButtonByText(wrapper, 'Add').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Edit')
    expect(wrapper.text()).toContain('Remove')
    expect(wrapper.text()).toContain('+125')

    await findButtonByText(wrapper, 'Edit').trigger('click')
    await flushUi()

    await wrapper.findComponent(AppNumberField).vm.$emit('update:modelValue', 150)
    await flushUi()

    await findButtonByText(wrapper, 'Save', { last: true }).trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('+150')
    expect(wrapper.text()).not.toContain('+125')
    expect(wrapper.text()).toContain('Add')
    expect(
      [...wrapper.findAll('button')].some((button) => button.text().trim() === 'Save')
    ).toBe(false)

    await findButtonByText(wrapper, 'Remove').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('No adjustment rules yet')
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
    expect(document.body.textContent || '').toContain('Settings are current for the latest completed run.')

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
