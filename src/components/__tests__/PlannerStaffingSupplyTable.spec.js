import { mount } from '@vue/test-utils'

import PlannerStaffingSupplyTable from '../planner/PlannerStaffingSupplyTable.vue'

describe('PlannerStaffingSupplyTable', () => {
  it('renders average and peak required headcount columns', () => {
    const wrapper = mount(PlannerStaffingSupplyTable, {
      props: {
        startingHeadcount: 20,
        startingFrontlineHeadcount: 18,
        staffingMonths: [
          {
            frontlineAttritionHeadcount: 0
          }
        ],
        selectedMonthIndex: 0,
        staffingRecords: [
          {
            monthIndex: 0,
            label: 'Jan',
            fullLabel: 'January',
            requiredHeadcount: 12.4,
            peakDayRequiredHeadcount: 15.8,
            startingRosterHeadcount: 20,
            startingFrontlineHeadcount: 18,
            hireHeadcount: 0,
            graduatingHeadcount: 0,
            inTrainingHeadcount: 0,
            frontlineAttritionPercent: 0,
            endingRosterHeadcount: 20,
            endingFrontlineHeadcount: 18,
            gapToRequirement: 5.6
          }
        ],
        formatNumber: (value) => Number(value ?? 0).toFixed(1)
      },
      global: {
        stubs: {
          AppSectionHeader: true
        }
      }
    })

    expect(wrapper.text()).toContain('Avg Req')
    expect(wrapper.text()).toContain('Peak Req')
    expect(wrapper.text()).toContain('15.8')
  })
})
