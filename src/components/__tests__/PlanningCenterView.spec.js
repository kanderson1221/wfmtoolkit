import { mount } from '@vue/test-utils'

import PlanningCenterView from '../planning/PlanningCenterView.vue'

const AppButtonStub = {
  name: 'AppButton',
  template: '<button><slot /></button>'
}

const AppPanelStub = {
  name: 'AppPanel',
  template: '<section><slot /></section>'
}

const buildWrapper = () =>
  mount(PlanningCenterView, {
    props: {
      center: {
        id: 'center-1',
        name: 'North America Support',
        operatingWeekdays: [1, 2, 3, 4, 5],
        groups: [
          {
            id: 'group-1',
            name: 'Voice Support',
            operatingWeekdays: [1, 2, 3, 4, 5],
            defaultPaidHoursPerDay: 8,
            defaultOccupancyPercent: 85,
            defaultAdherencePercent: 95,
            plans: [
              {
                id: 'plan-1',
                planningYear: 2026,
                summary: {
                  annualContacts: 180000,
                  annualRequiredStaffHours: 31200,
                  averageRequiredHeadcount: 18.4,
                  peakRequiredHeadcount: 24.9,
                  averagePresencePercent: 82.4,
                  averageUtilizationPercent: 88.6
                }
              }
            ]
          }
        ]
      },
      selectedGroupId: '',
      selectedYear: 2026,
      weekdayOptions: [
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' }
      ]
    },
    global: {
      stubs: {
        AppButton: AppButtonStub,
        AppBreadcrumbs: true,
        AppConfirmDialog: true,
        AppEmptyState: true,
        AppIcon: true,
        AppMenu: true,
        AppPanel: AppPanelStub,
        CallCenterSettingsModal: true,
        PlanningGroupSettingsModal: true,
        PlannerSettingsModal: true
      }
    }
  })

const findSpanByText = (wrapper, label) =>
  wrapper.findAll('span').find((node) => node.text().trim() === label)

const findHeadingByText = (wrapper, label) =>
  wrapper.findAll('h2').find((node) => node.text().trim() === label)

describe('PlanningCenterView', () => {
  it('keeps annual-plan headers on a single line with dense headcount labels', () => {
    const wrapper = buildWrapper()
    const peakHeader = findSpanByText(wrapper, 'Peak Req HC')
    const averageHeader = findSpanByText(wrapper, 'Avg Req HC')

    expect(peakHeader).toBeTruthy()
    expect(averageHeader).toBeTruthy()
    expect(peakHeader.attributes('title')).toBe('Peak Required Headcount')
    expect(peakHeader.classes()).toContain('whitespace-nowrap')
    expect(peakHeader.classes()).not.toContain('truncate')
    expect(averageHeader.attributes('title')).toBe('Average Required Headcount')
    expect(averageHeader.classes()).toContain('whitespace-nowrap')
    expect(averageHeader.classes()).not.toContain('truncate')
  })

  it('uses matching fixed xl header heights for the group and plan panes', () => {
    const wrapper = buildWrapper()
    const staffingGroupsHeading = findHeadingByText(wrapper, 'Staffing Groups')
    const annualPlansHeading = findHeadingByText(wrapper, 'Annual Plans')
    const staffingGroupsHeader = staffingGroupsHeading.element.closest('.border-b')
    const annualPlansHeader = annualPlansHeading.element.closest('.border-b')

    expect(staffingGroupsHeader.className).toContain('xl:h-[8.75rem]')
    expect(annualPlansHeader.className).toContain('xl:h-[8.75rem]')
  })
})
