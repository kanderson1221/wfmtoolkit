import { mount } from '@vue/test-utils'

import PlannerMonthlyPlanTab from '../planner/PlannerMonthlyPlanTab.vue'
import { createPlanDemandSource } from '../../planner/demandSources'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../plannerModel'

const AppSectionHeaderStub = {
  props: ['title'],
  template: '<h2>{{ title }}</h2>'
}

const AppButtonStub = {
  props: ['variant', 'size', 'icon', 'disabled'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>'
}

describe('PlannerMonthlyPlanTab', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const baseProps = {
    demandSource: createPlanDemandSource(),
    currentDemandSourceSummary: null,
    planMonths: [
      {
        contacts: 12000,
        ahtSeconds: 300,
        peakDayUpliftPercent: 15
      }
    ],
    selectedMonthIndex: 0,
    monthlyRecords: [
      {
        monthIndex: 0,
        label: 'Jan',
        fullLabel: 'January',
        openDays: 20,
        paidHoursPerMonth: 160,
        scheduledPercent: 72.5,
        randomLossPercent: 12.1,
        designFactorPercent: 60.4,
        workloadStaffingRatio: 1.65,
        workloadHours: 1200,
        requiredStaffHours: 1980,
        requiredHeadcount: 12.4,
        peakDayRequiredHeadcount: 15.8,
        peakDayUpliftPercent: 15,
        planWarnings: []
      }
    ],
    planSummary: {
      annualContacts: 120000,
      annualWorkloadHours: 9600,
      averageRequiredStaffHours: 1900,
      averageRequiredHeadcount: 11.8,
      peakMonth: {
        requiredHeadcount: 12.4,
        fullLabel: 'January'
      },
      peakDayMonth: {
        peakDayRequiredHeadcount: 15.8,
        fullLabel: 'January'
      }
    },
    formatWhole: (value) => String(value ?? 0),
    formatNumber: (value) => Number(value ?? 0).toFixed(1),
    formatPercent: (value) => `${Number(value ?? 0).toFixed(1)}%`,
    formatFactor: (value) => Number(value ?? 0).toFixed(2)
  }

  const mountTab = (props = {}) =>
    mount(PlannerMonthlyPlanTab, {
      props: {
        ...baseProps,
        ...props
      },
      global: {
        stubs: {
          AppSectionHeader: AppSectionHeaderStub,
          AppButton: AppButtonStub
        }
      }
    })

  it('renders workload-ratio summary with read-only forecast-owned demand inputs', () => {
    const wrapper = mountTab()

    expect(wrapper.text()).toContain('Demand Model')
    expect(wrapper.text()).toContain('Download Monthly CSV')
    expect(wrapper.text()).not.toContain('Download Interval CSV')
    expect(wrapper.text()).toContain('Peak Day Required Headcount')
    expect(wrapper.text()).toContain('12000')
    expect(wrapper.text()).toContain('Peak Day%')
    expect(wrapper.text()).toContain('Open Days')
    expect(wrapper.text()).toContain('Peak DayReq HC')
    expect(wrapper.findAll('input')).toHaveLength(0)
  })

  it('downloads the staffing-ratio monthly demand model CSV', async () => {
    const csvBlobs = []
    vi.stubGlobal('Blob', vi.fn((parts, options) => ({ parts, options })))
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob) => {
        csvBlobs.push(blob)
        return `blob:csv-${csvBlobs.length}`
      })
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => {})
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mountTab()
    const downloadButton = wrapper.findAll('button').find((button) => button.text().includes('Download Monthly CSV'))

    expect(downloadButton).toBeTruthy()

    await downloadButton.trigger('click')

    const monthlyCsv = csvBlobs[0].parts.join('')

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv-1')
    expect(monthlyCsv).toContain('month,contacts,aht_seconds,peak_day_percent,open_days,fte_paid_hours,scheduled_percent,random_percent,design_percent,staffing_ratio,workload_hours,required_hours,required_headcount,peak_day_required_headcount')
    expect(monthlyCsv).toContain('Jan,12000,300,15,20,160,72.5,12.1,60.4,1.65,1200,1980,12.4,15.8')
    expect(monthlyCsv).not.toContain('erlang_hours')
  })

  it('explains that modeled forecast contacts are updated in staffing-group forecasts', () => {
    const wrapper = mountTab({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectName: 'Consumer Voice 2026 Forecast',
        forecastSourceKind: 'modeled_daily',
        forecastMonthSnapshot: [
          {
            monthIndex: 0,
            monthLabel: 'Jan 2026',
            monthStart: '2026-01-01',
            contacts: 12000,
            averageDailyVolume: 600,
            peakDailyVolume: 780,
            ahtSeconds: 325
          }
        ]
      }),
      currentDemandSourceSummary: {
        projectName: 'Consumer Voice 2026 Forecast',
        sourceKind: 'modeled_daily'
      }
    })

    expect(wrapper.text()).toContain('Monthly contacts, AHT assumptions, and peak-day assumptions come from Consumer Voice 2026 Forecast and are read-only here.')
    expect(wrapper.text()).toContain('Update that saved forecast in Staffing Group Forecasts to refresh those values.')
    expect(wrapper.text()).toContain('325.0')
    expect(wrapper.text()).toContain('30.0%')
  })

  it('explains that imported forecast contacts must be replaced in staffing-group forecasts', () => {
    const wrapper = mountTab({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectName: 'Imported Daily Forecast',
        forecastSourceKind: 'imported_daily',
        forecastMonthSnapshot: [
          {
            monthIndex: 0,
            monthLabel: 'Jan 2026',
            monthStart: '2026-01-01',
            contacts: 12000,
            averageDailyVolume: 600,
            peakDailyVolume: 750,
            ahtSeconds: 315
          }
        ]
      }),
      currentDemandSourceSummary: {
        projectName: 'Imported Daily Forecast',
        sourceKind: 'imported_daily'
      }
    })

    expect(wrapper.text()).toContain('Monthly contacts, AHT assumptions, and peak-day assumptions come from Imported Daily Forecast and are read-only here.')
    expect(wrapper.text()).toContain('Update that saved forecast in Staffing Group Forecasts to refresh those values.')
  })

  it('explains when the original forecast source was deleted', () => {
    const wrapper = mountTab({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectName: 'Deleted Staffing Forecast',
        forecastSourceKind: 'modeled_daily'
      }),
      currentDemandSourceSummary: {
        projectName: 'Deleted Staffing Forecast',
        sourceKind: 'modeled_daily',
        sourceMissing: true
      }
    })

    expect(wrapper.text()).toContain('Monthly contacts, AHT assumptions, and peak-day assumptions came from Deleted Staffing Forecast, which has been deleted.')
    expect(wrapper.text()).toContain('Current values remain in this plan until you apply a different forecast.')
  })

  it('renders plan warnings through the shared status message pattern', () => {
    const wrapper = mountTab({
      monthlyRecords: [
        {
          monthIndex: 0,
          label: 'Jan',
          fullLabel: 'January',
          openDays: 20,
          scheduledPercent: 72.5,
          randomLossPercent: 12.1,
          designFactorPercent: 60.4,
          workloadStaffingRatio: 1.65,
          workloadHours: 1200,
          requiredStaffHours: 1980,
          requiredHeadcount: 12.4,
          peakDayRequiredHeadcount: 15.8,
          peakDayUpliftPercent: 15,
          planWarnings: ['January design factor is below target.']
        }
      ]
    })

    const warningMessage = wrapper.get('[role="alert"]')

    expect(warningMessage.text()).toContain('January design factor is below target.')
    expect(warningMessage.classes()).toContain('border-rose-200')
  })

  it('renders the intraday Erlang shell with placeholder requirement columns', () => {
    const wrapper = mountTab({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectName: 'Daily Budget Forecast',
        forecastMonthSnapshot: [
          {
            monthIndex: 0,
            monthLabel: 'Jan 2026',
            monthStart: '2026-01-01',
            contacts: 12000,
            ahtSeconds: 325
          }
        ],
        forecastDailySnapshot: [
          {
            serviceDate: '2026-01-02',
            monthIndex: 0,
            monthLabel: 'Jan',
            contacts: 500
          }
        ]
      }),
      currentDemandSourceSummary: {
        projectName: 'Daily Budget Forecast'
      },
      requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
      erlangStatus: {
        status: 'schedule_required',
        message: 'Set the staffing group operating hours before running intraday Erlang.'
      },
      monthlyRecords: [
        {
          monthIndex: 0,
          label: 'Jan',
          fullLabel: 'January',
          requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
          openDays: 20,
          scheduledPercent: 72.5,
          randomLossPercent: 3.6,
          designFactorPercent: 68.9,
          workloadStaffingRatio: 1.45,
          workloadHours: 1200,
          erlangStaffedHours: null,
          weightedOccupancyPercent: null,
          weightedServiceLevelPercent: null,
          requiredStaffHours: 0,
          requiredHeadcount: 0,
          peakDayRequiredHeadcount: 0,
          peakIntervalRequiredHeadcount: null,
          planWarnings: []
        }
      ],
      planSummary: {
        annualContacts: 120000,
        annualWorkloadHours: 9600,
        annualErlangStaffedHours: null,
        annualRequiredStaffHours: 0,
        averageWeightedOccupancyPercent: null,
        averageWeightedServiceLevelPercent: null,
        averageRequiredHeadcount: 0,
        peakIntervalMonth: null
      }
    })

    expect(wrapper.text()).toContain('Demand Model')
    expect(wrapper.text()).toContain('Annual Base Erlang Hrs')
    expect(wrapper.text()).toContain('Annual Total Req Hrs')
    expect(wrapper.text()).toContain('Avg Total Req HC')
    expect(wrapper.text()).not.toContain('Avg Weighted Occ')
    expect(wrapper.text()).not.toContain('Avg Service Level')
    expect(wrapper.text()).not.toContain('Peak Interval Base HC')
    expect(wrapper.text()).toContain('Erlang Hrs')
    expect(wrapper.text()).toContain('Base HC')
    expect(wrapper.text()).toContain('Occ. %')
    expect(wrapper.text()).toContain('SL %')
    expect(wrapper.text()).toContain('Sched. %')
    expect(wrapper.text()).toContain('Random %')
    expect(wrapper.text()).toContain('Design %')
    expect(wrapper.text()).toContain('Staff Ratio')
    expect(wrapper.text()).toContain('Total Hrs')
    expect(wrapper.text()).toContain('Total HC')
    expect(wrapper.text()).toContain('Peak Day HC')
    expect(wrapper.text()).toContain('P80 Total HC')
    expect(wrapper.text()).toContain('P90 Total HC')
    expect(wrapper.text()).toContain('Run Staffing Calculations')
    expect(wrapper.text()).not.toContain('RequiredHrs')
    expect(wrapper.text()).toContain('1 daily rows are available for Intraday Erlang.')
    expect(wrapper.text()).not.toContain('Intraday Erlang plans require an applied daily forecast.')
    expect(wrapper.text()).toContain('325')
    expect(wrapper.findAll('input')).toHaveLength(0)
  })

  it('emits an explicit run event and shows calculation progress for intraday Erlang', async () => {
    const wrapper = mountTab({
      requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
      erlangStatus: {
        status: 'ready_to_run',
        message: 'Run staffing calculations to populate monthly Erlang staffing outputs.',
        canRun: true,
        isRunning: false,
        hasResults: false
      }
    })

    const runButton = wrapper.findAll('button').find((button) => button.text().includes('Run Staffing Calculations'))

    expect(runButton).toBeTruthy()

    await runButton.trigger('click')

    expect(wrapper.emitted('run-erlang')).toHaveLength(1)

    await wrapper.setProps({
      erlangStatus: {
        status: 'loading',
        message: 'Calculating staffing for Feb.',
        canRun: false,
        isRunning: true,
        hasResults: false,
        progress: {
          completedMonths: 1,
          totalMonths: 4,
          currentMonthLabel: 'Feb',
          completedRows: 48,
          totalRows: 192
        }
      }
    })

    expect(wrapper.text()).toContain('Calculating staffing for Feb.')
    expect(wrapper.text()).toContain('Calculating Feb. 1 of 4 months complete.')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('25')
  })

  it('explains when Intraday Erlang has monthly forecast values but no daily rows', () => {
    const wrapper = mountTab({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectName: 'Monthly Budget Forecast',
        forecastMonthSnapshot: [
          {
            monthIndex: 0,
            monthLabel: 'Jan 2026',
            monthStart: '2026-01-01',
            contacts: 12000,
            ahtSeconds: 325
          }
        ]
      }),
      currentDemandSourceSummary: {
        projectName: 'Monthly Budget Forecast'
      },
      requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
      erlangStatus: {
        status: 'forecast_required',
        message: 'Intraday Erlang plans require an applied daily forecast.'
      }
    })

    expect(wrapper.text()).toContain('Forecast monthly values are applied from Monthly Budget Forecast, but daily rows are missing.')
    expect(wrapper.text()).toContain('Apply a modeled or imported daily forecast before running Intraday Erlang.')
  })

  it('switches the Erlang interval pressure column between peak day and percentile headcount', async () => {
    const wrapper = mountTab({
      requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
      intervalRecords: [6, 7, 8, 10, 12].map((requiredStaffNet, index) => ({
        monthIndex: 0,
        serviceDate: `2026-01-0${index + 2}`,
        intervalStart: `2026-01-0${index + 2}T08:00:00`,
        intervalLengthMinutes: 30,
        requiredStaffNet
      })),
      monthlyRecords: [
        {
          monthIndex: 0,
          label: 'Jan',
          fullLabel: 'January',
          requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
          openDays: 20,
          scheduledPercent: 72.5,
          randomLossPercent: 3.6,
          designFactorPercent: 68.9,
          workloadStaffingRatio: 1.5,
          workloadHours: 1200,
          erlangStaffedHours: 1330.25,
          weightedOccupancyPercent: 84.5,
          weightedServiceLevelPercent: 79.25,
          requiredStaffHours: 1930.98,
          requiredHeadcount: 12.1,
          paidHoursPerMonth: 160,
          peakDayRequiredHeadcount: 14.2,
          peakIntervalRequiredHeadcount: 12,
          planWarnings: []
        }
      ],
      planSummary: {
        annualContacts: 120000,
        annualWorkloadHours: 9600,
        annualErlangStaffedHours: 1330.25,
        averageWeightedOccupancyPercent: 84.5,
        averageWeightedServiceLevelPercent: 79.25,
        averageRequiredHeadcount: 12.1,
        peakIntervalMonth: {
          peakIntervalRequiredHeadcount: 12
        }
      }
    })

    const selectedMetricCell = () => wrapper.findAll('tbody tr')[0].findAll('td').at(-1).text()
    const metricSelect = wrapper.get('select[aria-label="Interval pressure headcount metric"]')

    expect(metricSelect.element.value).toBe('peak_day_total')
    expect(selectedMetricCell()).toBe('14.2')

    await metricSelect.setValue('p80_interval_total')
    expect(selectedMetricCell()).toBe('15.0')

    await metricSelect.setValue('p90_interval_total')
    expect(selectedMetricCell()).toBe('18.0')
  })

  it('downloads monthly and interval CSV exports for intraday Erlang plans', async () => {
    const csvBlobs = []
    vi.stubGlobal('Blob', vi.fn((parts, options) => ({ parts, options })))
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob) => {
        csvBlobs.push(blob)
        return `blob:csv-${csvBlobs.length}`
      })
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => {})
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mountTab({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectName: 'Daily Budget Forecast',
        importedPlanningYear: 2026,
        forecastMonthSnapshot: [
          {
            monthIndex: 0,
            monthLabel: 'Jan 2026',
            monthStart: '2026-01-01',
            contacts: 12000,
            ahtSeconds: 325
          }
        ],
        forecastDailySnapshot: [
          {
            serviceDate: '2026-01-02',
            monthIndex: 0,
            monthLabel: 'Jan',
            contacts: 500
          }
        ]
      }),
      currentDemandSourceSummary: {
        projectName: 'Daily Budget Forecast'
      },
      requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
      intervalRecords: [
        {
          monthIndex: 0,
          serviceDate: '2026-01-02',
          intervalStart: '2026-01-02T08:00:00',
          intervalLengthMinutes: 30,
          callsOffered: 25,
          averageHandleTimeSeconds: 325,
          workloadHours: 2.256944,
          erlangRequiredStaffNet: 1,
          minimumHeadcount: 7,
          requiredStaffNet: 7,
          minimumApplied: true,
          laborHoursNet: 3.5,
          serviceLevel: 0.81234,
          occupancy: 0.76234,
          averageSpeedOfAnswerSeconds: 12.3,
          percentAnsweredImmediately: 0.42,
          abandonPercent: 0.01
        }
      ],
      monthlyRecords: [
        {
          monthIndex: 0,
          label: 'Jan',
          fullLabel: 'January',
          requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
          openDays: 20,
          scheduledPercent: 72.5,
          randomLossPercent: 3.6,
          designFactorPercent: 68.9,
          workloadStaffingRatio: 1.451379,
          workloadHours: 1200,
          erlangStaffedHours: 1330.25,
          minimumHeadcount: 7,
          minimumAppliedIntervalCount: 14,
          weightedOccupancyPercent: 84.5,
          weightedServiceLevelPercent: 79.25,
          requiredStaffHours: 1930.98,
          requiredHeadcount: 12.1,
          paidHoursPerMonth: 160,
          peakDayRequiredHeadcount: 14.2,
          peakIntervalRequiredHeadcount: 7,
          planWarnings: []
        }
      ],
      planSummary: {
        annualContacts: 120000,
        annualWorkloadHours: 9600,
        annualErlangStaffedHours: 1330.25,
        averageWeightedOccupancyPercent: 84.5,
        averageWeightedServiceLevelPercent: 79.25,
        averageRequiredHeadcount: 12.1,
        peakIntervalMonth: {
          peakIntervalRequiredHeadcount: 7
        }
      }
    })

    const downloadButtons = wrapper.findAll('button').filter((button) => button.text().includes('Download'))

    expect(downloadButtons).toHaveLength(2)

    await downloadButtons[0].trigger('click')
    await downloadButtons[1].trigger('click')

    const monthlyCsv = csvBlobs[0].parts.join('')
    const intervalCsv = csvBlobs[1].parts.join('')

    expect(clickSpy).toHaveBeenCalledTimes(2)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv-1')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv-2')
    expect(monthlyCsv).toContain('month,contacts,aht_seconds,open_days,fte_paid_hours,workload_hours,erlang_hours,minimum_headcount,minimum_applied_intervals,base_headcount')
    expect(monthlyCsv).not.toContain('peak_interval_base_headcount')
    expect(monthlyCsv).toContain('peak_day_total_headcount')
    expect(monthlyCsv).toContain('Jan,12000,325,20,160,1200,1330.25,7,14,8.314063,84.5,79.25,72.5')
    expect(intervalCsv).toContain('month_index,month,service_date,interval_start,interval_length_minutes,calls_offered')
    expect(intervalCsv).toContain('erlang_required_staff_net,minimum_headcount,required_staff_net,minimum_applied,labor_hours_net,wfm_staffing_ratio,wfm_labor_hours_gross')
    expect(intervalCsv).not.toContain(',labor_hours_gross,')
    expect(intervalCsv).toContain('0,Jan,2026-01-02,2026-01-02T08:00:00,30,25,325,2.256944,1,7,7,true,3.5,1.451379,5.079827,81.234,76.234,12.3,42,1')
  })
})
