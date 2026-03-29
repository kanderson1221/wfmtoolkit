import { shallowMount } from '@vue/test-utils'

import PlannerPresenceTab from '../planner/PlannerPresenceTab.vue'

describe('PlannerPresenceTab', () => {
  it('keeps grouped availability header classes for calendar, presence, utilization, and results', () => {
    const wrapper = shallowMount(PlannerPresenceTab, {
      props: {
        presenceMonths: [
          {
            paidHoursPerDay: 8,
            plannedTimeOffHours: 6,
            unplannedTimeOffHours: 4,
            leaveTimeHours: 3,
            meetingsHours: 2,
            trainingHours: 2,
            coachingHours: 1,
            paidBreaksHoursPerDay: 0.5,
            otherAwayHoursPerDay: 0.2
          }
        ],
        monthlyRecords: [
          {
            monthIndex: 0,
            label: 'Jan',
            fullLabel: 'January',
            openDays: 20,
            paidHoursPerMonth: 160,
            totalLossHours: 24,
            presencePercent: 85,
            utilizationPercent: 80,
            scheduledPercent: 68
          }
        ],
        summary: {
          totalOpenDays: 240,
          averageAbsenceLossHours: 12,
          averageScheduledLossHours: 8,
          averageOtherLossHours: 4,
          averageTotalLossHours: 24,
          averagePresence: 85
        },
        formatWhole: (value) => String(value ?? 0),
        formatNumber: (value) => Number(value ?? 0).toFixed(1),
        formatPercent: (value) => `${Number(value ?? 0).toFixed(1)}%`
      },
      global: {
        stubs: {
          PlannerCopyMenu: true
        }
      }
    })

    expect(wrapper.findAll('th.presence-detail-calendar')).toHaveLength(2)
    expect(wrapper.findAll('th.presence-detail-presence')).toHaveLength(3)
    expect(wrapper.findAll('th.presence-detail-utilization')).toHaveLength(5)
    expect(wrapper.findAll('th.presence-detail-results')).toHaveLength(5)
    expect(wrapper.text()).toContain('Calendar')
    expect(wrapper.text()).toContain('Presence Loss')
    expect(wrapper.text()).toContain('Utilization Loss')
    expect(wrapper.text()).toContain('Results')
  })
})
