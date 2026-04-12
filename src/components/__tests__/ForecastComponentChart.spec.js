import { mount } from '@vue/test-utils'

import ForecastComponentChart from '../forecasting/ForecastComponentChart.vue'
import AppLineChart from '../ui/AppLineChart.vue'

describe('ForecastComponentChart', () => {
  it('does not enable zoom controls for component charts', () => {
    const wrapper = mount(ForecastComponentChart, {
      props: {
        title: 'Weekly',
        points: Array.from({ length: 60 }, (_, index) => ({
          label: `2026-01-${String(index + 1).padStart(2, '0')}`,
          value: 100 + index
        })),
        formatNumber: (value) => String(value)
      }
    })

    const lineChart = wrapper.getComponent(AppLineChart)
    expect(lineChart.props('option').dataZoom).toEqual([])
  })
})
