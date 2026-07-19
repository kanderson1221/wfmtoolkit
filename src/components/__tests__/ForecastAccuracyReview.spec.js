import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ForecastAccuracyReview from '../forecasting/ForecastAccuracyReview.vue'
import { createForecastProject } from '../../forecasting/shared'

const AppButtonStub = {
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
}

const buildHoldout = (overrides = {}) => ({
  testRows: 60,
  testDateRange: '2025-11-02 to 2025-12-31',
  trainingDateRange: '2023-01-01 to 2025-11-01',
  wape: 6.8,
  mae: 58.4,
  bias: -12.6,
  intervalCoverage: 81.7,
  intervalWidthPercent: 80,
  benchmark: {
    id: 'weekday_average_8',
    label: '8-week weekday average',
    wape: 9.5,
    mae: 81.6,
    bias: 24.3
  },
  comparison: {
    lowerWape: 'model',
    wapeDeltaPoints: -2.7
  },
  rows: [
    {
      ds: '2025-12-31',
      actualValue: 900,
      forecastValue: 870,
      lowerBound: 820,
      upperBound: 930,
      absoluteError: 30,
      signedError: -30,
      percentError: 3.3,
      withinInterval: true,
      benchmarkValue: 950,
      benchmarkAbsoluteError: 50,
      benchmarkSignedError: 50
    }
  ],
  ...overrides
})

const mountReview = (holdout = buildHoldout()) => mount(ForecastAccuracyReview, {
  props: {
    holdout,
    projectName: 'Consumer Voice 2026 Forecast'
  },
  global: {
    stubs: {
      AppButton: AppButtonStub,
      AppStatusMessage: { template: '<div role="status"><slot /></div>' },
      AppTableShell: { template: '<div><slot /></div>' }
    }
  }
})

describe('ForecastAccuracyReview', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aligns modeled and benchmark evidence with units and no automatic acceptance', () => {
    const wrapper = mountReview()

    expect(wrapper.get('table').text()).toContain('WAPE')
    expect(wrapper.get('table').text()).toContain('6.8%')
    expect(wrapper.get('table').text()).toContain('9.5%')
    expect(wrapper.get('table').text()).toContain('-12.6 contacts/day')
    expect(wrapper.get('table').text()).toContain('configured 80% modeled prediction interval')
    expect(wrapper.text()).toContain('not an automatic acceptance decision')
    expect(wrapper.text()).toContain('training data only')
  })

  it('keeps older saved results readable and requests a rerun for baseline evidence', () => {
    const wrapper = mountReview(buildHoldout({ benchmark: null, comparison: null }))

    expect(wrapper.text()).toContain('predates benchmark comparison')
    expect(wrapper.text()).toContain('Run the forecast again')
    expect(wrapper.get('table').text()).toContain('Not available')
  })

  it('downloads the complete scored-day review through the shared CSV utility', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:forecast-accuracy')
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = mountReview()

    await wrapper.get('button').trigger('click')

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:forecast-accuracy')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('reuses the comparison table for leakage-safe handle-time evidence', () => {
    const dates = Array.from({ length: 17 }, (_, index) => {
      const day = String(index + 1).padStart(2, '0')
      return `2025-01-${day}`
    })
    const project = createForecastProject({
      name: 'Voice AHT',
      historyRows: dates.map((ds) => ({ ds, y: 100 })),
      ahtHistoryRows: dates.map((ds, index) => ({
        ds,
        contacts: 100,
        ahtSeconds: index < 14 ? 300 : 330
      })),
      modelConfig: {
        holdoutDays: 3,
        ahtAssumptionMethod: 'weighted_average'
      },
      lastRun: {
        runAt: '2025-01-18T12:00:00.000Z',
        monthlyRollup: [{ monthStart: '2025-02-01', monthLabel: 'Feb 2025', contacts: 10000 }]
      }
    })
    const wrapper = mount(ForecastAccuracyReview, {
      props: { project, projectName: project.name, reviewType: 'aht' },
      global: {
        stubs: {
          AppButton: AppButtonStub,
          AppStatusMessage: { template: '<div role="status"><slot /></div>' },
          AppTableShell: { template: '<div><slot /></div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('Handle time accuracy review')
    expect(wrapper.text()).toContain('3 of 3 test days scored')
    expect(wrapper.get('table').text()).toContain('Workload error')
    expect(wrapper.get('table').text()).toContain('Training weighted average')
  })
})
