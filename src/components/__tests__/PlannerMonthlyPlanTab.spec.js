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

  it('explains that forecast-sourced contacts are managed in Forecast', () => {
    const wrapper = mountTab({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectName: 'Consumer Voice 2026 Forecast'
      }),
      currentDemandSourceSummary: {
        projectName: 'Consumer Voice 2026 Forecast'
      }
    })

    expect(wrapper.text()).toContain('Monthly contacts come from Consumer Voice 2026 Forecast.')
    expect(wrapper.text()).toContain('Manage contact volume in Forecast.')
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
