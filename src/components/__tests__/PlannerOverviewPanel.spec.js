import { mount } from '@vue/test-utils'

import PlannerOverviewPanel from '../planner/PlannerOverviewPanel.vue'

describe('PlannerOverviewPanel', () => {
  it('renders peak-day demand in the forecast summary', () => {
    const wrapper = mount(PlannerOverviewPanel, {
      props: {
        planSummary: {
          annualContacts: 120000,
          annualWorkloadHours: 9600,
          peakMonth: {
            requiredHeadcount: 12.4,
            fullLabel: 'January'
          },
          peakDayMonth: {
            peakDayRequiredHeadcount: 15.8,
            fullLabel: 'January'
          },
          averageRequiredHeadcount: 11.8
        },
        staffingSummary: {
          startingFrontlineHeadcount: 18,
          endingFrontlineHeadcount: 20,
          totalGraduatingHeadcount: 3,
          averageGapToRequirement: -1.2
        },
        sectionCards: [],
        nextRecommendation: null,
        planComplete: true,
        formatWhole: (value) => String(value ?? 0),
        formatNumber: (value) => Number(value ?? 0).toFixed(1)
      },
      global: {
        stubs: {
          AppSectionHeader: true,
          AppStatusMessage: true
        }
      }
    })

    expect(wrapper.text()).toContain('Peak Day HC')
    expect(wrapper.text()).toContain('15.8')
  })

  it('uses consistent open actions for the next step and section rows', () => {
    const wrapper = mount(PlannerOverviewPanel, {
      props: {
        planSummary: {
          annualContacts: 120000,
          annualWorkloadHours: 9600,
          peakMonth: {
            requiredHeadcount: 12.4,
            fullLabel: 'January'
          },
          peakDayMonth: {
            peakDayRequiredHeadcount: 15.8,
            fullLabel: 'January'
          },
          averageRequiredHeadcount: 11.8
        },
        staffingSummary: {
          startingFrontlineHeadcount: 18,
          endingFrontlineHeadcount: 20,
          totalGraduatingHeadcount: 3,
          averageGapToRequirement: -1.2
        },
        sectionCards: [
          {
            id: 'availability',
            title: 'Agent Availability',
            description: 'Set shrinkage, occupancy, and schedule assumptions.',
            statusLabel: 'Needs Review',
            actionLabel: 'Open Agent Availability'
          }
        ],
        nextRecommendation: {
          sectionId: 'availability',
          title: 'Agent Availability',
          description: 'Continue the setup for service assumptions.',
          actionLabel: 'Open Agent Availability'
        },
        planComplete: false,
        formatWhole: (value) => String(value ?? 0),
        formatNumber: (value) => Number(value ?? 0).toFixed(1)
      },
      global: {
        stubs: {
          AppSectionHeader: true,
          AppStatusMessage: true
        }
      }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.map((button) => button.text())).toEqual(['Open', 'Open'])
  })
})
