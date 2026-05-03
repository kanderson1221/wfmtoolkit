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
    expect(wrapper.text()).toContain('Review the forecast currently applied')
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
        averageAhtSeconds: 286.4,
        peakMonthLabel: 'January',
        runAt: '2026-04-06T12:00:00Z',
        matchedMonthCount: 12
      },
      currentDemandSourceSummary: {
        projectName: 'Consumer Voice 2026 Forecast',
        coverageLabel: '12/12 months',
        totalContacts: 175000,
        averageAhtSeconds: 286.4,
        importedAt: '2026-04-07T12:00:00Z'
      },
      forecastCanApply: true,
      forecastApplyMessage: 'Reapplied Consumer Voice 2026 Forecast. Monthly contacts and starting AHT assumptions were refreshed from the saved forecast.'
    })

    expect(wrapper.text()).toContain('Currently Applied')
    expect(wrapper.text()).toContain('12/12 months')
    expect(wrapper.text()).toContain('175000')
    expect(wrapper.text()).toContain('286.4 sec')
    expect(wrapper.text()).toContain('Applied')
    expect(wrapper.text()).toContain('Applied to this plan')
    expect(wrapper.text()).toContain('Reapplied Consumer Voice 2026 Forecast')
    expect(wrapper.text()).toContain('Reapply Forecast to Contacts & AHT')
    expect(wrapper.text()).not.toContain('Open Staffing Group Forecasts')
    expect(wrapper.get('button').classes()).toContain('bg-[#15395f]')
    expect(wrapper.findAll('h3').filter((node) => node.text() === 'Consumer Voice 2026 Forecast')).toHaveLength(1)
  })

  it('blocks monthly-only forecasts when Intraday Erlang needs daily rows', () => {
    const wrapper = mountPanel({
      requiresDailyForecast: true,
      selectedForecastProjectId: 'forecast-1',
      forecastSelectOptions: [
        { label: 'Select a saved forecast', value: '' },
        { label: 'Consumer Voice 2026 Forecast', value: 'forecast-1' }
      ],
      selectedForecastPreviewSummary: {
        projectName: 'Consumer Voice 2026 Forecast',
        sourceKindLabel: 'Monthly',
        coverageLabel: 'Covers 12/12 required months',
        totalContacts: 175000,
        averageAhtSeconds: 286.4,
        matchedMonthCount: 12,
        dailySnapshotCount: 0
      },
      forecastCanApply: false
    })

    expect(wrapper.text()).toContain('This forecast does not include daily rows')
    expect(wrapper.text()).toContain('Apply Forecast to Contacts, AHT & Daily Rows')
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
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

    expect(wrapper.text()).toContain('Replace Forecast')
    expect(wrapper.text()).toContain('Select a saved forecast to preview its coverage for this plan year.')
    expect(wrapper.text()).not.toContain('Monthly Contact Volume')
  })

  it('keeps the applied forecast visible even before a replacement forecast is selected', () => {
    const wrapper = mountPanel({
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectId: 'forecast-1',
        forecastProjectName: 'Consumer Voice 2026 Forecast',
        importedAt: '2026-04-07T12:00:00Z',
        forecastMonthSnapshot: [
          {
            monthIndex: 0,
            monthLabel: 'Jan',
            contacts: 14000,
            ahtSeconds: 286.4
          }
        ]
      }),
      forecastSelectOptions: [
        { label: 'Select a saved forecast', value: '' },
        { label: 'Consumer Voice 2026 Forecast', value: 'forecast-1' }
      ],
      currentDemandSourceSummary: {
        projectName: 'Consumer Voice 2026 Forecast',
        sourceKindLabel: 'Modeled',
        forecastType: 'budget',
        coverageLabel: '12/12 months',
        totalContacts: 175000,
        averageAhtSeconds: 286.4,
        peakMonthLabel: 'January',
        runAt: '2026-04-06T12:00:00Z'
      }
    })

    expect(wrapper.text()).toContain('Currently Applied')
    expect(wrapper.text()).toContain('Consumer Voice 2026 Forecast')
    expect(wrapper.text()).toContain('12/12 months')
    expect(wrapper.text()).toContain('175000')
    expect(wrapper.text()).toContain('286.4 sec')
    expect(wrapper.text()).toContain('Select another saved forecast to preview and replace the currently applied source.')
  })

  it('shows locked-budget guidance instead of replacement controls for read-only plans', () => {
    const wrapper = mountPanel({
      readOnly: true,
      readOnlyMessage: 'Budget plan is locked. Create an updated plan to change future assumptions.',
      demandSource: createPlanDemandSource({
        mode: 'forecast',
        forecastProjectId: 'forecast-1',
        forecastProjectName: 'Consumer Voice 2026 Forecast',
        importedAt: '2026-04-07T12:00:00Z',
        forecastMonthSnapshot: [
          {
            monthIndex: 0,
            monthLabel: 'Jan',
            contacts: 14000,
            ahtSeconds: 286.4
          }
        ]
      }),
      forecastSelectOptions: [
        { label: 'Select a saved forecast', value: '' },
        { label: 'Replacement Forecast', value: 'forecast-2' }
      ],
      currentDemandSourceSummary: {
        projectName: 'Consumer Voice 2026 Forecast',
        sourceKindLabel: 'Modeled',
        forecastType: 'budget',
        coverageLabel: '12/12 months',
        totalContacts: 175000,
        averageAhtSeconds: 286.4,
        peakMonthLabel: 'January',
        runAt: '2026-04-06T12:00:00Z'
      },
      forecastCanApply: true
    })

    expect(wrapper.text()).toContain('Currently Applied')
    expect(wrapper.text()).toContain('Consumer Voice 2026 Forecast')
    expect(wrapper.text()).toContain('Budget plan is locked. Create an updated plan to change future assumptions.')
    expect(wrapper.text()).not.toContain('Replace Forecast')
    expect(wrapper.text()).not.toContain('Reapply Forecast to Contacts & AHT')
    expect(wrapper.find('#planner-demand-source-forecast').exists()).toBe(false)
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
    expect(wrapper.text()).toContain('Current monthly contacts and any imported AHT assumptions remain in this plan until you apply a different forecast.')
  })
})
