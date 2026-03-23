import { mount } from '@vue/test-utils'

import PlannerActualsPanel from '../planner/PlannerActualsPanel.vue'

describe('PlannerActualsPanel', () => {
  it('renders actuals summary, chart section, and worksheet columns', async () => {
    const formatNumber = (value, digits = 1) =>
      Number(value ?? 0).toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      })

    const wrapper = mount(PlannerActualsPanel, {
      props: {
        actualsMonths: [
          {
            actualContacts: 10200,
            actualAhtSeconds: 310
          }
        ],
        actualsRecords: [
          {
            monthIndex: 0,
            label: 'Jan',
            fullLabel: 'January',
            isLoaded: true,
            plannedContacts: 10000,
            plannedAhtSeconds: 300,
            plannedWorkloadHours: 833.3,
            actualWorkloadHours: 878.3,
            actualRequiredHeadcount: 11.2,
            plannedRequiredHeadcount: 10.4,
            requiredHeadcountVariance: 0.8,
            plannedStartingTotalHeadcount: 14,
            plannedStartingFrontlineHeadcount: 12,
            plannedEndingTotalHeadcount: 15,
            plannedEndingFrontlineHeadcount: 13
          }
        ],
        actualsSummary: {
          loadedMonthsCount: 1,
          contactsVariance: 200,
          averageAhtVarianceSeconds: 10,
          averageRequiredHeadcountVariance: 0.8,
          peakActualRequiredHeadcount: 11.2,
          peakPlannedRequiredHeadcount: 10.4
        },
        formatWhole: (value) => String(value ?? 0),
        formatNumber
      },
      global: {
        stubs: {
          PlannerActualsComparisonChart: true,
          AppSectionHeader: true
        }
      }
    })

    expect(wrapper.text()).toContain('Months Loaded')
    expect(wrapper.text()).toContain('Workload')
    expect(wrapper.text()).toContain('Staffing')
    expect(wrapper.text()).toContain('PlannedContacts')
    expect(wrapper.text()).toContain('ActualContacts')
    expect(wrapper.text()).toContain('Planned AHTSec')
    expect(wrapper.text()).toContain('Planned WkldHrs')
    expect(wrapper.text()).toContain('Actual WkldHrs')
    expect(wrapper.text()).toContain('+5.4%')
    expect(wrapper.text()).toContain('Planned ReqHC')
    expect(wrapper.text()).toContain('Actual ReqHC')
    expect(wrapper.text()).toContain('Req HCVariance')
    expect(wrapper.text()).not.toContain('Planned HCLens')
    expect(wrapper.text()).toContain('Gap vsActual Req HC')
    expect(wrapper.text()).toContain('10,000')
    expect(wrapper.text()).toContain('300')

    const metricSelect = wrapper.get('select[aria-label="Planned staffing headcount metric"]')
    const actualContactsInput = wrapper.get('input[aria-label="Actual contacts"]')

    expect(actualContactsInput.element.value).toBe('10,200')
    expect(wrapper.text()).toContain('12.0')
    expect(wrapper.text()).toContain('0.8')

    await metricSelect.setValue('plannedEndingTotalHeadcount')

    expect(wrapper.text()).toContain('15.0')
    expect(wrapper.text()).toContain('3.8')
  })
})
