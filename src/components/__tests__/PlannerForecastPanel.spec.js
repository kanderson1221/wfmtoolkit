import { mount } from '@vue/test-utils'

import PlannerForecastPanel from '../planner/PlannerForecastPanel.vue'
import { createPlanDemandSource } from '../../planner/demandSources'

const baseProps = {
  entryMode: 'manual',
  demandSource: createPlanDemandSource(),
  planMonths: [
    {
      contacts: 12000,
      ahtSeconds: 300,
      peakDayUpliftPercent: 15
    },
    {
      contacts: 13500,
      ahtSeconds: 305,
      peakDayUpliftPercent: 15
    }
  ],
  selectedForecastProjectId: '',
  selectedMonthIndex: 0,
  monthlyRecords: [
    {
      monthIndex: 0,
      label: 'Jan',
      fullLabel: 'January',
      openDays: 20
    },
    {
      monthIndex: 1,
      label: 'Feb',
      fullLabel: 'February',
      openDays: 19
    }
  ],
  forecastWorkspaceHref: '#planning/center/center-1/group/group-1/forecasts/year/2026',
  forecastSelectOptions: [{ label: 'Select a saved forecast', value: '' }],
  selectedForecastPreviewSummary: null,
  currentDemandSourceSummary: null,
  formatWhole: (value) => String(Math.round(Number(value ?? 0))),
  formatNumber: (value) => Number(value ?? 0).toFixed(1)
}

const mountPanel = (props = {}) =>
  mount(PlannerForecastPanel, {
    props: {
      ...baseProps,
      ...props
    }
  })

describe('PlannerForecastPanel', () => {
  it('renders the manual monthly input table inside Forecast', () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('Demand Source')
    expect(wrapper.text()).toContain('Manual monthly contacts are maintained here.')
    expect(wrapper.text()).toContain('Monthly Contact Volume')
    expect(wrapper.text()).toContain('Avg / Open')
    expect(wrapper.text()).toContain('Open Staffing Group Forecasts')
    expect(wrapper.findAll('input')).toHaveLength(2)
  })

  it('shows the saved-forecast empty state when forecast sourcing is selected without saved forecasts', async () => {
    const wrapper = mountPanel({
      entryMode: 'forecast',
      demandSource: createPlanDemandSource({
        mode: 'forecast'
      })
    })

    expect(wrapper.text()).toContain('No saved forecasts available')
    expect(wrapper.text()).toContain('Open Staffing Group Forecasts')
  })

  it('shows forecast preview details and apply actions for saved forecasts', async () => {
    const wrapper = mountPanel({
      entryMode: 'forecast',
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectId: 'forecast-1',
        forecastProjectName: 'Consumer Voice 2026 Forecast',
        importedAt: '2026-04-07T12:00:00Z',
        forecastMonthSnapshot: [
          {
            monthIndex: 0,
            monthLabel: 'Jan',
            contacts: 14000
          }
        ]
      }),
      selectedForecastProjectId: 'forecast-1',
      forecastSelectOptions: [
        { label: 'Select a saved forecast', value: '' },
        { label: 'Consumer Voice 2026 Forecast', value: 'forecast-1' }
      ],
      selectedForecastPreviewSummary: {
        projectName: 'Consumer Voice 2026 Forecast',
        coverageLabel: '12/12 months',
        totalContacts: 175000,
        peakMonthLabel: 'January',
        runAt: '2026-04-06T12:00:00Z',
        matchedMonthCount: 12
      },
      currentDemandSourceSummary: {
        projectName: 'Consumer Voice 2026 Forecast'
      },
      forecastCanApply: true
    })

    expect(wrapper.text()).toContain('12/12 months')
    expect(wrapper.text()).toContain('175000')
    expect(wrapper.text()).toContain('Applied')
    expect(wrapper.text()).toContain('Applied to this plan')
    expect(wrapper.text()).toContain('Reapply Forecast to Contacts')
    expect(wrapper.text()).toContain('Open Staffing Group Forecasts')
  })

  it('shows saved-forecast controls only when forecast sourcing is selected', () => {
    const wrapper = mountPanel({
      entryMode: 'forecast',
      demandSource: createPlanDemandSource({
        mode: 'forecast'
      }),
      forecastSelectOptions: [
        { label: 'Select a saved forecast', value: '' },
        { label: 'Consumer Voice Forecast', value: 'forecast-1' }
      ]
    })

    expect(wrapper.text()).toContain('Saved Forecast')
    expect(wrapper.text()).toContain('Select a saved forecast to preview its coverage for this plan year.')
    expect(wrapper.text()).not.toContain('Monthly Contact Volume')
  })
})
