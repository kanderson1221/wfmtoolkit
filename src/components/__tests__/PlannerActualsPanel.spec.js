import { mount } from '@vue/test-utils'

import PlannerActualsPanel from '../planner/PlannerActualsPanel.vue'

describe('PlannerActualsPanel', () => {
  const formatNumber = (value, digits = 1) =>
    Number(value ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })

  const mountPanel = (props = {}) => mount(PlannerActualsPanel, {
    props: {
      actualsRecords: [
        {
          monthIndex: 0,
          label: 'Jan',
          fullLabel: 'January',
          isLoaded: true,
          plannedContacts: 10000,
          actualContacts: 10200,
          plannedAhtSeconds: 300,
          actualAhtSeconds: 310,
          plannedWorkloadHours: 833.3,
          actualWorkloadHours: 878.3,
          actualRequiredHeadcount: 11.2,
          plannedRequiredHeadcount: 10.4,
          requiredHeadcountVariance: 0.8,
          plannedStartingTotalHeadcount: 14,
          plannedStartingFrontlineHeadcount: 12,
          plannedEndingTotalHeadcount: 15,
          plannedEndingFrontlineHeadcount: 13,
          actualLoadedDaysCount: 22,
          actualLoadedOpenDaysCount: 22,
          actualExpectedOpenDaysCount: 22,
          actualsCoverageStatus: 'complete',
          actualsCoverageComplete: true
        }
      ],
      actualsSummary: {
        loadedMonthsCount: 1,
        completeMonthsCount: 1,
        incompleteMonthsCount: 0,
        contactsVariance: 200,
        averageAhtVarianceSeconds: 10,
        averageRequiredHeadcountVariance: 0.8,
        peakActualRequiredHeadcount: 11.2,
        peakPlannedRequiredHeadcount: 10.4
      },
      formatWhole: (value) => String(value ?? 0),
      formatNumber,
      ...props
    },
    global: {
      stubs: {
        PlannerActualsComparisonChart: true,
        AppSectionHeader: true
      }
    }
  })

  it('renders actuals summary, chart section, and worksheet columns', async () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('Coverage-ready months')
    expect(wrapper.text()).toContain('22 / 22 complete')
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

    expect(wrapper.find('input[aria-label="Actual contacts"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('10,200')
    expect(wrapper.text()).toContain('12.0')
    expect(wrapper.text()).toContain('0.8')

    await metricSelect.setValue('plannedEndingTotalHeadcount')

    expect(wrapper.text()).toContain('15.0')
    expect(wrapper.text()).toContain('3.8')
  })

  it('names incomplete months and keeps dependent results unavailable', () => {
    const partialRecord = {
      ...mountPanel().props('actualsRecords')[0],
      actualLoadedDaysCount: 5,
      actualLoadedOpenDaysCount: 5,
      actualExpectedOpenDaysCount: 22,
      actualsCoverageStatus: 'partial',
      actualsCoverageComplete: false,
      actualRequiredHeadcount: null,
      requiredHeadcountVariance: null
    }
    const wrapper = mountPanel({
      actualsRecords: [partialRecord],
      actualsSummary: {
        loadedMonthsCount: 1,
        completeMonthsCount: 0,
        incompleteMonthsCount: 1,
        contactsVariance: null,
        averageAhtVarianceSeconds: null,
        averageRequiredHeadcountVariance: null,
        peakActualRequiredHeadcount: null,
        peakPlannedRequiredHeadcount: 10.4
      }
    })

    expect(wrapper.text()).toContain('Jan has incomplete Data tab coverage')
    expect(wrapper.text()).toContain('5 / 22 partial')
    expect(wrapper.text()).toContain('full-month variances, actual requirement, and staffing gap are withheld')
  })

  it('lets users explicitly run actual Erlang calculations', async () => {
    const wrapper = mountPanel({
      actualsErlangStatus: {
        status: 'ready_to_run',
        message: 'Run actual staffing calculations to populate actual Intraday Erlang requirements.',
        canRun: true,
        isRunning: false,
        hasResults: false
      }
    })

    const runButton = wrapper.findAll('button').find((button) => button.text().includes('Run Actual Calculations'))

    expect(runButton).toBeTruthy()

    await runButton.trigger('click')

    expect(wrapper.emitted('run-actuals-erlang')).toHaveLength(1)
    expect(wrapper.text()).toContain('Run actual staffing calculations')
  })

  it('shows actual Erlang progress while calculations are running', () => {
    const wrapper = mountPanel({
      actualsErlangStatus: {
        status: 'loading',
        message: 'Calculating actual staffing for Feb.',
        canRun: false,
        isRunning: true,
        progress: {
          completedMonths: 1,
          totalMonths: 3,
          currentMonthLabel: 'Feb',
          completedRows: 20,
          totalRows: 60
        }
      }
    })

    expect(wrapper.text()).toContain('Calculating Actual Requirements')
    expect(wrapper.text()).toContain('1/3 months complete')
  })
})
