import { mount } from '@vue/test-utils'

import PlannerMonthlyPlanTab from '../planner/PlannerMonthlyPlanTab.vue'

describe('PlannerMonthlyPlanTab', () => {
  it('renders peak-planning summary and worksheet columns', () => {
    const wrapper = mount(PlannerMonthlyPlanTab, {
      props: {
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
      },
      global: {
        stubs: {
          AppSectionHeader: true,
          AppButton: true
        }
      }
    })

    expect(wrapper.text()).toContain('Peak Day HC')
    expect(wrapper.text()).toContain('Peak Day%')
    expect(wrapper.text()).toContain('PeakHC')
  })
})
