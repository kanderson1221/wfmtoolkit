import { mount } from '@vue/test-utils'

import PlannerStaffingPlanTab from '../planner/PlannerStaffingPlanTab.vue'

describe('PlannerStaffingPlanTab', () => {
  it('passes year-end target controls and inherited carry-in classes into the child tables', () => {
    const wrapper = mount(PlannerStaffingPlanTab, {
      props: {
        planningYear: 2026,
        yearEndTargetDefaults: {
          frontlineHeadcount: 38
        },
        trainingSettings: {
          trainingDurationWorkdays: 10,
          graduationYieldPercent: 90,
          availableTrainers: 1,
          maxClassSize: 10,
          postTrainingNestingDays: 5,
          startOnFirstBusinessDayOfWeek: true
        },
        nextYearOpening: {
          rosterHeadcount: null,
          frontlineHeadcount: null
        },
        startingHeadcount: 44,
        startingFrontlineHeadcount: 38,
        staffingMonths: Array.from({ length: 12 }, () => ({ frontlineAttritionHeadcount: 0 })),
        trainingClasses: [],
        inheritedTrainingClasses: [
          {
            id: 'carry-in-1',
            hireDate: '2025-12-18',
            hireCount: 10,
            source: 'inherited',
            inheritedFromPlanningYear: 2025
          }
        ],
        selectedMonthIndex: 0,
        staffingRecords: [
          {
            monthIndex: 0,
            label: 'Jan',
            fullLabel: 'January',
            requiredHeadcount: 0,
            peakDayRequiredHeadcount: 0,
            startingRosterHeadcount: 44,
            startingFrontlineHeadcount: 38,
            hireHeadcount: 0,
            graduatingHeadcount: 0,
            inTrainingHeadcount: 0,
            frontlineAttritionPercent: 0,
            endingRosterHeadcount: 44,
            endingFrontlineHeadcount: 38,
            gapToRequirement: 38
          }
        ],
        formatNumber: (value) => Number(value ?? 0).toFixed(1)
      },
      global: {
        stubs: {
          PlannerTrainingPipelineTable: {
            props: ['inheritedTrainingClasses'],
            template: '<div data-test="pipeline">{{ inheritedTrainingClasses.length }}</div>'
          },
          PlannerStaffingSupplyTable: {
            props: ['yearEndTargetEnabled', 'yearEndHeadcountTarget', 'startingPositionInherited', 'startingPositionInheritedFromYear'],
            template: '<div data-test="supply-target">{{ yearEndTargetEnabled ? yearEndHeadcountTarget : "disabled" }}|{{ startingPositionInherited ? startingPositionInheritedFromYear : "editable" }}</div>'
          },
          PlannerTrainingSettingsModal: true,
          AppSectionHeader: true
        }
      }
    })

    expect(wrapper.find('[data-test="supply-target"]').text()).toBe('disabled|editable')
    expect(wrapper.find('[data-test="pipeline"]').text()).toBe('1')
  })
})
