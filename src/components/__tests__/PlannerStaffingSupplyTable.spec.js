import { mount } from '@vue/test-utils'

import PlannerStaffingSupplyTable from '../planner/PlannerStaffingSupplyTable.vue'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../plannerModel'

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

  it('shows peak interval requirement in intraday Erlang mode', () => {
    const wrapper = mount(PlannerStaffingSupplyTable, {
      props: {
        requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
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
            peakIntervalRequiredHeadcount: 14.6,
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

    expect(wrapper.text()).toContain('Peak Interval')
    expect(wrapper.text()).toContain('14.6')
    expect(wrapper.text()).not.toContain('15.8')
  })

  it('locks January starting inputs when the opening position is inherited from the prior year', () => {
    const wrapper = mount(PlannerStaffingSupplyTable, {
      props: {
        startingHeadcount: 42,
        startingFrontlineHeadcount: 42,
        startingPositionInherited: true,
        startingPositionInheritedFromYear: 2026,
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
            startingRosterHeadcount: 42,
            startingFrontlineHeadcount: 42,
            hireHeadcount: 0,
            graduatingHeadcount: 0,
            inTrainingHeadcount: 0,
            frontlineAttritionPercent: 0,
            endingRosterHeadcount: 42,
            endingFrontlineHeadcount: 42,
            gapToRequirement: 29.6
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

    expect(wrapper.find('input[aria-label="Starting roster headcount for the first month"]').exists()).toBe(false)
    expect(wrapper.find('input[aria-label="Starting frontline headcount for the first month"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('January opening headcount is inherited from the 2026 plan')
  })

  it('lets December ending frontline become the editable next-year target when enabled', () => {
    const wrapper = mount(PlannerStaffingSupplyTable, {
      props: {
        startingHeadcount: 20,
        startingFrontlineHeadcount: 18,
        yearEndTargetEnabled: true,
        yearEndHeadcountTarget: 22,
        staffingMonths: [
          ...Array.from({ length: 11 }, () => ({ frontlineAttritionHeadcount: 0 })),
          { frontlineAttritionHeadcount: 0 }
        ],
        selectedMonthIndex: 11,
        staffingRecords: Array.from({ length: 12 }, (_, monthIndex) => ({
          monthIndex,
          label: monthIndex === 11 ? 'Dec' : 'Jan',
          fullLabel: monthIndex === 11 ? 'December' : 'January',
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
        })),
        formatNumber: (value) => Number(value ?? 0).toFixed(1)
      },
      global: {
        stubs: {
          AppSectionHeader: true
        }
      }
    })

    expect(wrapper.find('input[aria-label="December ending frontline headcount target"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('the December Ending Frontline Headcount cell becomes an editable target')
    expect(wrapper.text()).toContain('against a target of 22.0')
    expect(wrapper.text()).toContain('Projected: 18.0')
  })
})
