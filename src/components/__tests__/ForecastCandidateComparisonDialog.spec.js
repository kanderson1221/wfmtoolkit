import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ForecastCandidateComparisonDialog from '../forecasting/ForecastCandidateComparisonDialog.vue'
import { createForecastProject } from '../../forecasting/shared'

const AppDialogStub = {
  props: ['visible'],
  emits: ['update:visible', 'close'],
  template: '<section v-if="visible"><slot /><slot name="footer" /></section>'
}

const buildProject = (overrides = {}) => createForecastProject({
  id: overrides.id || 'reference',
  name: overrides.name || 'Reference Forecast',
  sourceKind: 'modeled_daily',
  modelConfig: {
    growth: 'linear',
    seasonalityMode: 'additive',
    weeklySeasonalityEnabled: true,
    yearlySeasonalityEnabled: true,
    monthlySeasonalityEnabled: false,
    builtInHolidayCountry: 'US',
    changepointPriorScale: 0.05,
    intervalWidth: 0.8,
    ...(overrides.modelConfig || {})
  },
  lastRun: {
    runAt: '2026-07-19T12:00:00.000Z',
    diagnostics: {
      holdout: {
        testRows: 2,
        trainingDateRange: '2025-01-01 to 2025-12-31',
        testDateRange: '2026-01-01 to 2026-01-02',
        wape: 8.4,
        mae: 42,
        bias: -12,
        intervalCoverage: 80,
        intervalWidthPercent: 80,
        benchmark: { wape: 11.9 },
        rows: [
          { ds: '2026-01-01', actualValue: 500 },
          { ds: '2026-01-02', actualValue: 520 }
        ],
        ...(overrides.holdout || {})
      }
    }
  }
})

const mountDialog = (projects) => mount(ForecastCandidateComparisonDialog, {
  props: {
    visible: true,
    projects,
    currentProjectId: 'reference'
  },
  global: {
    stubs: {
      AppButton: {
        emits: ['click'],
        template: '<button @click="$emit(\'click\')"><slot /></button>'
      },
      AppDialog: AppDialogStub,
      AppEmptyState: {
        props: ['title', 'description'],
        template: '<div>{{ title }} {{ description }}</div>'
      },
      AppFieldGroup: {
        props: ['label', 'helpText'],
        template: '<div><span>{{ label }}</span><slot /><span>{{ helpText }}</span></div>'
      },
      AppStatusMessage: {
        template: '<div role="status"><slot /></div>'
      },
      AppTableShell: {
        template: '<div><slot /></div>'
      }
    }
  }
})

describe('ForecastCandidateComparisonDialog', () => {
  it('explains that two scored modeled forecasts are required', () => {
    const wrapper = mountDialog([buildProject()])

    expect(wrapper.text()).toContain('Two scored forecasts required')
    expect(wrapper.text()).toContain('Save and run at least two modeled daily forecasts')
    expect(wrapper.text()).not.toContain('Accuracy evidence')
  })

  it('defaults to the current forecast and a comparable saved candidate', () => {
    const wrapper = mountDialog([
      buildProject(),
      buildProject({
        id: 'candidate',
        name: 'Candidate Forecast',
        modelConfig: { growth: 'flat' },
        holdout: { wape: 6.1, mae: 31, bias: 8, intervalCoverage: 90 }
      })
    ])
    const selects = wrapper.findAll('select')

    expect(selects).toHaveLength(2)
    expect(selects[0].element.value).toBe('reference')
    expect(selects[1].element.value).toBe('candidate')
    expect(selects[0].attributes()).toHaveProperty('autofocus')
    expect(wrapper.text()).toContain('Identical dated actual contacts verified.')
    expect(wrapper.text()).toContain('Candidate Forecast has 2.3 percentage points lower WAPE')
    expect(wrapper.text()).toContain('comparative evidence, not an automatic acceptance decision')
    expect(wrapper.text()).toContain('Growth model')
    expect(wrapper.text()).toContain('Changed')
  })

  it('withholds metrics when selected forecasts use different holdout actuals', async () => {
    const wrapper = mountDialog([
      buildProject(),
      buildProject({
        id: 'incompatible',
        name: 'Incompatible Forecast',
        holdout: {
          rows: [
            { ds: '2026-01-01', actualValue: 500 },
            { ds: '2026-01-02', actualValue: 999 }
          ]
        }
      })
    ])

    expect(wrapper.text()).toContain('not scored against the same dated actual contacts')
    expect(wrapper.text()).not.toContain('Accuracy evidence')
  })
})
