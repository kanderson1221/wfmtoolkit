import { mount } from '@vue/test-utils'

import ForecastingWorkspace from '../ForecastingWorkspace.vue'
import ForecastingControlPanel from '../forecasting/ForecastingControlPanel.vue'
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
    volumeColumn: 'call_volume',
    capColumn: '',
    floorColumn: ''
  }
})

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

    const downloadLinks = wrapper.findAll('a').map((link) => link.element)
    expect(downloadLinks.some((link) => (link.textContent || '').includes('Download Sample Template'))).toBe(true)
    expect(
      downloadLinks.some(
        (link) => link.getAttribute('href') === '/forecasting_daily_volume_sample_2022_2024.csv'
      )
    ).toBe(true)
    expect(downloadLinks.some((link) => link.getAttribute('href') === '/forecasting_daily_volume_template.csv')).toBe(false)
    expect(wrapper.text()).toContain('Upload Daily History')
    expect(wrapper.text()).not.toContain('No historical CSV loaded yet.')
    expect(wrapper.text()).not.toContain('Time Zone')
    expect(wrapper.text()).not.toContain('Series')
    expect(wrapper.text()).toContain('Data')
    expect(wrapper.text()).toContain('Forecast Setup')
    expect(wrapper.text()).toContain('Review')
  })

  it('renders a unified historical-data workspace with file summary and mapped columns', async () => {
    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-historical-data-spec',
        projectSeed: createLoadedProject('loaded-history.csv')
      }
    })
    mountedWrappers.push(wrapper)

    await flushUi()
    await flushUi()

    expect(wrapper.text()).toContain('Historical Data')
    expect(wrapper.text()).toContain('File Summary')
    expect(wrapper.text()).toContain('Daily History')
    expect(wrapper.text()).toContain('File Definition')
    expect(wrapper.text()).toContain('Mapped Column')
    expect(wrapper.text()).not.toContain('Field Mapping')
    expect(wrapper.text()).toContain('Total Contacts')
    expect(wrapper.text()).toContain('11,725')
    expect(wrapper.text()).toContain('Jan 1, 2025')
    expect(wrapper.text()).toContain('Jan 14, 2025')
    expect(wrapper.find('#forecast-date-column').exists()).toBe(true)
    expect(wrapper.find('#forecast-contacts-column').exists()).toBe(true)
    expect(wrapper.find('#forecast-ceiling-column').exists()).toBe(true)
    expect(wrapper.find('#forecast-floor-column').exists()).toBe(true)
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

  it('inherits holiday effects from the call center without showing a holiday selector', async () => {
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
    await findButtonByText(wrapper, 'Forecast Setup').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Holiday Effects')
    expect(wrapper.text()).toContain('Uses United States holiday calendar')
    expect(wrapper.text()).toContain('United States holiday calendar')
    expect(wrapper.text()).toContain('Company Day · 2026-12-26')
    expect(wrapper.find('#forecast-holiday-country').exists()).toBe(false)
    expect(wrapper.text()).toContain('Custom holidays are managed at the call center level.')
  })

  it('uploads daily history, runs the forecast, and shows the monthly rollup', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
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
          dataPrepActions: ['Filled 0 missing date gaps with zero volume.'],
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
    await findButtonByText(wrapper, 'Forecast Setup').trigger('click')
    await flushUi()

    await wrapper.findComponent(ForecastingControlPanel).vm.$emit('run-forecast')
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
    expect(wrapper.text()).toContain('Projected Contacts')
    expect(wrapper.text()).toContain('2,030')
    expect(wrapper.text()).toContain('Review')
    expect(wrapper.text()).toContain('Forecast run complete. Forecast saved.')

    await findButtonByText(wrapper, 'Monthly Rollup').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Monthly Rollup')
    expect(wrapper.text()).toContain('Jan 2026')
    expect(wrapper.text()).toContain('Jan 2, 2026')
    expect(wrapper.text()).toContain('1,025')

    await findButtonByText(wrapper, 'Accuracy', { last: true }).trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Forecast vs Actual')
    expect(wrapper.text()).toContain('RMSE')
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
    expect(initialWrapper.text()).toContain('Forecast saved.')

    const wrapper = mount(ForecastingWorkspace, {
      props: {
        storageScope: 'forecast-save-spec'
      }
    })
    mountedWrappers.push(wrapper)
    await flushUi()
    expect(wrapper.text()).toContain('Upload Daily History')
    expect(wrapper.text()).not.toContain('No historical CSV loaded yet.')

    await findButtonByText(wrapper, 'Open Forecast').trigger('click')
    await flushUi()
    expect(document.body.textContent || '').toContain('Open Forecast')

    await clickBodyButton('Open Forecast', { last: true })

    expect(wrapper.text()).toContain('File Summary')
    expect(wrapper.text()).toContain('Total Contacts')
    expect(wrapper.text()).toContain('11,725')
    expect(wrapper.text()).not.toContain('No file loaded')
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
          forecastType: 'reforecast',
          coverageStartMonthIndex: 3
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

    expect(wrapper.text()).toContain('File Summary')
    expect(wrapper.text()).toContain('11,725')
    expect(wrapper.text()).not.toContain('No file loaded')

    await findButtonByText(wrapper, 'Forecast Setup').trigger('click')
    await flushUi()

    expect(wrapper.find('#forecast-type').element.value).toBe('reforecast')
    expect(wrapper.find('#forecast-reforecast-start-month').exists()).toBe(true)
    expect(wrapper.find('#forecast-reforecast-start-month').element.value).toBe('3')
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
