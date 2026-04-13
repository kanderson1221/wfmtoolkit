import { mount } from '@vue/test-utils'

import PlannerForecastPanel from '../planner/PlannerForecastPanel.vue'
import { createPlanDemandSource } from '../../planner/demandSources'

const baseProps = {
  demandSource: createPlanDemandSource(),
  selectedForecastProjectId: '',
  forecastSelectOptions: [{ label: 'Select a saved forecast', value: '' }],
  selectedForecastPreviewSummary: null,
  currentDemandSourceSummary: null,
  hasLegacyManualDemandSource: false,
  legacyManualSummary: null,
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
  it('renders the saved-source workflow inside Forecast', () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('Demand Source')
    expect(wrapper.text()).toContain('Choose a saved staffing-group forecast')
    expect(wrapper.text()).not.toContain('Manual monthly contacts are maintained here.')
  })

  it('shows the saved-forecast empty state when forecast sourcing is selected without saved forecasts', async () => {
    const wrapper = mountPanel({
      entryMode: 'forecast',
      demandSource: createPlanDemandSource({
        mode: 'forecast'
      })
    })

    expect(wrapper.text()).toContain('No saved forecasts available')
    expect(wrapper.text()).toContain('Create and save a staffing-group forecast first')
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
    expect(wrapper.text()).not.toContain('Open Staffing Group Forecasts')
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

  it('shows the one-time legacy conversion state for manual plans', () => {
    const wrapper = mountPanel({
      hasLegacyManualDemandSource: true,
      legacyManualSummary: {
        totalContacts: 182500,
        monthCount: 12
      }
    })

    expect(wrapper.text()).toContain('legacy manual monthly contacts')
    expect(wrapper.text()).toContain('182500 contacts across 12 months')
    expect(wrapper.text()).toContain('Convert to Saved Forecast')
  })

  it('shows a subtle warning when the applied forecast was deleted', () => {
    const wrapper = mountPanel({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectId: 'forecast-deleted',
        forecastProjectName: 'Deleted Staffing Forecast',
        importedAt: '2026-04-12T15:00:00Z',
        forecastMonthSnapshot: [
          {
            monthIndex: 0,
            monthLabel: 'Jan',
            contacts: 14000
          }
        ]
      }),
      forecastSelectOptions: [
        { label: 'Select a saved forecast', value: '' },
        { label: 'Replacement Forecast', value: 'forecast-2' }
      ],
      currentDemandSourceSummary: {
        projectName: 'Deleted Staffing Forecast',
        sourceMissing: true
      }
    })

    expect(wrapper.text()).toContain('Deleted Staffing Forecast was deleted.')
    expect(wrapper.text()).toContain('Current monthly contacts remain in this plan until you apply a different forecast.')
  })
})
