import { mount } from '@vue/test-utils'

import PlannerRandomTab from '../planner/PlannerRandomTab.vue'
import { PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG } from '../../plannerModel'

const AppButtonStub = {
  name: 'AppButton',
  template: '<button><slot /></button>'
}

const AppSectionHeaderStub = {
  props: ['title'],
  template: '<h2>{{ title }}</h2>'
}

const AppStatusMessageStub = {
  template: '<div><slot /></div>'
}

const AppTableNumberFieldStub = {
  props: ['modelValue'],
  template: '<input :value="modelValue" />'
}

const buildProps = (overrides = {}) => ({
  randomDefaults: {
    occupancyPercent: 90,
    adherencePercent: 95
  },
  randomMonths: [
    {
      occupancyPercent: 90,
      adherencePercent: 95
    }
  ],
  monthlyRecords: [
    {
      monthIndex: 0,
      label: 'Jan',
      fullLabel: 'January',
      scheduledPercent: 72.5,
      adherenceLossPercent: 3.6,
      occupancyLossPercent: 7.1,
      randomLossPercent: 10.7
    }
  ],
  summary: {
    usesMonthlyOverrides: false,
    globalOccupancyPercent: 90,
    globalAdherencePercent: 95,
    averageOccupancyPercent: 90,
    averageAdherencePercent: 95,
    averageAdherenceLossPercent: 3.6,
    averageOccupancyLossPercent: 7.1,
    averageRandomLossPercent: 10.7
  },
  formatPercent: (value) => `${Number(value ?? 0).toFixed(1)}%`,
  ...overrides
})

describe('PlannerRandomTab', () => {
  it('shows the updated assumptions heading and hides monthly overrides when override mode is off', () => {
    const wrapper = mount(PlannerRandomTab, {
      props: buildProps(),
      global: {
        stubs: {
          AppButton: AppButtonStub,
          AppCheckbox: true,
          AppFieldGroup: true,
          AppNumberField: true,
          AppSectionHeader: AppSectionHeaderStub,
          AppStatStrip: true,
          AppStatusMessage: AppStatusMessageStub,
          AppTableNumberField: AppTableNumberFieldStub,
          PlannerCopyMenu: true
        }
      }
    })

    expect(wrapper.text()).toContain('Random/Variability')
    expect(wrapper.text()).toContain('Assumptions')
    expect(wrapper.text()).not.toContain('Random/Variability Assumptions')
    expect(wrapper.text()).not.toContain('Monthly Overrides')
    expect(wrapper.text()).not.toContain('Variability Buffer')
    expect(wrapper.text()).toContain('Continue to Demand Model')
    expect(wrapper.text()).not.toContain('Continue to Required Headcount')
  })

  it('shows the monthly overrides heading when override mode is on', () => {
    const wrapper = mount(PlannerRandomTab, {
      props: buildProps({
        useMonthlyRandomOverrides: true,
        summary: {
          usesMonthlyOverrides: true,
          globalOccupancyPercent: 90,
          globalAdherencePercent: 95,
          averageOccupancyPercent: 90,
          averageAdherencePercent: 95,
          averageAdherenceLossPercent: 3.6,
          averageOccupancyLossPercent: 7.1,
          averageRandomLossPercent: 10.7
        }
      }),
      global: {
        stubs: {
          AppButton: AppButtonStub,
          AppCheckbox: true,
          AppFieldGroup: true,
          AppNumberField: true,
          AppSectionHeader: AppSectionHeaderStub,
          AppStatStrip: true,
          AppStatusMessage: AppStatusMessageStub,
          AppTableNumberField: AppTableNumberFieldStub,
          PlannerCopyMenu: true
        }
      }
    })

    expect(wrapper.text()).toContain('Monthly Overrides')
  })

  it('renames the step to Erlang Inputs and shows inherited intraday assumptions', () => {
    const wrapper = mount(PlannerRandomTab, {
      props: buildProps({
        requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
        serviceLevelPercent: 80,
        serviceLevelThresholdSeconds: 20,
        operatingOpenTime: '08:00',
        operatingCloseTime: '20:00',
        intraday: {
          intervalLengthMinutes: 30,
          minimumHeadcount: 2,
          intervalRatios: [
            { intervalStart: '08:00', ratioPercent: 50 },
            { intervalStart: '08:30', ratioPercent: 50 }
          ]
        },
        currentDemandSourceSummary: {
          projectName: 'FY26 Budget Forecast'
        }
      }),
      global: {
        stubs: {
          AppButton: AppButtonStub,
          AppCheckbox: true,
          AppFieldGroup: true,
          AppNumberField: true,
          AppSectionHeader: AppSectionHeaderStub,
          AppStatStrip: true,
          AppStatusMessage: AppStatusMessageStub,
          AppTableNumberField: AppTableNumberFieldStub,
          PlannerCopyMenu: true
        }
      }
    })

    expect(wrapper.text()).toContain('Erlang Inputs')
    expect(wrapper.text()).toContain('Demand Model uses the staffing-group service goal, operating window, and 30-minute interval profile.')
    expect(wrapper.text()).toContain('80.0% in 20 sec')
    expect(wrapper.text()).toContain('adherence overhead applied afterward')
    expect(wrapper.text()).toContain('08:00 to 20:00')
    expect(wrapper.text()).toContain('2 intervals @ 30 min')
    expect(wrapper.text()).toContain('Minimum HC / Open Interval')
    expect(wrapper.text()).toContain('FY26 Budget Forecast')
    expect(wrapper.text()).toContain('Continue to Demand Model')
    expect(wrapper.text()).not.toContain('Monthly Overrides')
  })

  it('labels an always-open Erlang schedule without relying on equal clock times', () => {
    const wrapper = mount(PlannerRandomTab, {
      props: buildProps({
        requirementMethod: PLAN_REQUIREMENT_METHOD_INTRADAY_ERLANG,
        operatingScheduleMode: 'always_open',
        operatingOpenTime: '',
        operatingCloseTime: ''
      }),
      global: {
        stubs: {
          AppButton: AppButtonStub,
          AppCheckbox: true,
          AppFieldGroup: true,
          AppNumberField: true,
          AppSectionHeader: AppSectionHeaderStub,
          AppStatStrip: true,
          AppStatusMessage: AppStatusMessageStub,
          AppTableNumberField: AppTableNumberFieldStub,
          PlannerCopyMenu: true
        }
      }
    })

    expect(wrapper.text()).toContain('Open 24 hours')
    expect(wrapper.text()).not.toContain('Needs call center hours')
  })
})
