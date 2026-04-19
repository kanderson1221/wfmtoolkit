import { mount } from '@vue/test-utils'

import PlannerMonthlyPlanTab from '../planner/PlannerMonthlyPlanTab.vue'
import { createPlanDemandSource } from '../../planner/demandSources'

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

  it('renders peak-planning summary with read-only contacts and editable assumption columns', () => {
    const wrapper = mountTab()

    expect(wrapper.text()).toContain('Demand Model')
    expect(wrapper.text()).toContain('Peak Day Required Headcount')
    expect(wrapper.text()).toContain('12000')
    expect(wrapper.text()).toContain('Peak Day%')
    expect(wrapper.text()).toContain('BusinessDays')
    expect(wrapper.text()).toContain('Peak DayReq HC')
    expect(wrapper.findAll('input')).toHaveLength(2)
  })

  it('explains that modeled forecast contacts are updated in staffing-group forecasts', () => {
    const wrapper = mountTab({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectName: 'Consumer Voice 2026 Forecast',
        forecastSourceKind: 'modeled_daily'
      }),
      currentDemandSourceSummary: {
        projectName: 'Consumer Voice 2026 Forecast',
        sourceKind: 'modeled_daily'
      }
    })

    expect(wrapper.text()).toContain('Monthly contacts come from Consumer Voice 2026 Forecast.')
    expect(wrapper.text()).toContain('Starting AHT assumptions were loaded from the same forecast and can still be edited here.')
  })

  it('explains that imported forecast contacts must be replaced in staffing-group forecasts', () => {
    const wrapper = mountTab({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectName: 'Imported Daily Forecast',
        forecastSourceKind: 'imported_daily'
      }),
      currentDemandSourceSummary: {
        projectName: 'Imported Daily Forecast',
        sourceKind: 'imported_daily'
      }
    })

    expect(wrapper.text()).toContain('Monthly contacts and starting AHT assumptions come from Imported Daily Forecast.')
    expect(wrapper.text()).toContain('Replace that saved forecast in Staffing Group Forecasts to refresh those imported values.')
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

    expect(wrapper.text()).toContain('Monthly contacts and any imported AHT assumptions came from Deleted Staffing Forecast, which has been deleted.')
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
})
