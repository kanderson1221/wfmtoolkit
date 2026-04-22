import { mount } from '@vue/test-utils'

import PlannerMonthlyPlanTab from '../planner/PlannerMonthlyPlanTab.vue'
import { createPlanDemandSource } from '../../planner/demandSources'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../plannerModel'

const AppSectionHeaderStub = {
  props: ['title'],
  template: '<h2>{{ title }}</h2>'
}

describe('PlannerMonthlyPlanTab', () => {
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
          AppButton: true
        }
      }
    })

  it('renders workload-ratio summary with read-only forecast-owned demand inputs', () => {
    const wrapper = mountTab()

    expect(wrapper.text()).toContain('Demand Model')
    expect(wrapper.text()).toContain('Peak Day Required Headcount')
    expect(wrapper.text()).toContain('12000')
    expect(wrapper.text()).toContain('Peak Day%')
    expect(wrapper.text()).toContain('BusinessDays')
    expect(wrapper.text()).toContain('Peak DayReq HC')
    expect(wrapper.findAll('input')).toHaveLength(0)
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
      requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
      erlangStatus: {
        status: 'forecast_required',
        message: 'Intraday Erlang plans require an applied daily forecast.'
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
        averageWeightedOccupancyPercent: null,
        averageWeightedServiceLevelPercent: null,
        averageRequiredHeadcount: 0,
        peakIntervalMonth: null
      }
    })

    expect(wrapper.text()).toContain('Demand Model')
    expect(wrapper.text()).toContain('Annual Erlang Hrs')
    expect(wrapper.text()).toContain('Avg Weighted Occ')
    expect(wrapper.text()).toContain('Avg Service Level')
    expect(wrapper.text()).toContain('ErlangHrs')
    expect(wrapper.text()).toContain('Occupancy')
    expect(wrapper.text()).toContain('ServiceLevel')
    expect(wrapper.text()).toContain('Scheduled %')
    expect(wrapper.text()).toContain('Random%')
    expect(wrapper.text()).toContain('Design%')
    expect(wrapper.text()).toContain('StaffingRatio')
    expect(wrapper.text()).toContain('RequiredHeadcount')
    expect(wrapper.text()).toContain('Peak DayReq HC')
    expect(wrapper.text()).toContain('Peak IntervalReq HC')
    expect(wrapper.text()).not.toContain('RequiredHrs')
    expect(wrapper.text()).toContain('Intraday Erlang plans require an applied daily forecast.')
    expect(wrapper.text()).toContain('325')
    expect(wrapper.findAll('input')).toHaveLength(0)
  })
})
