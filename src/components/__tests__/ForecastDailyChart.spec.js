import { mount } from '@vue/test-utils'

import ForecastDailyChart from '../forecasting/ForecastDailyChart.vue'
import AppLineChart from '../ui/AppLineChart.vue'

const formatNumber = (value, maximumFractionDigits = 0) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits
}).format(Number(value) || 0)

describe('ForecastDailyChart', () => {
  it('uses a tighter y-axis when the series is well above zero', () => {
    const wrapper = mount(ForecastDailyChart, {
      props: {
        formatNumber,
        rows: [
          { ds: '2026-01-01', actualValue: 980, yhat: 990, yhatLower: 950, yhatUpper: 1030, isHistory: true },
          { ds: '2026-01-02', actualValue: 1040, yhat: 1035, yhatLower: 1000, yhatUpper: 1075, isHistory: true },
          { ds: '2026-01-03', actualValue: 1125, yhat: 1110, yhatLower: 1070, yhatUpper: 1150, isHistory: true },
          { ds: '2026-01-04', actualValue: 1280, yhat: 1295, yhatLower: 1240, yhatUpper: 1340, isHistory: false },
          { ds: '2026-01-05', actualValue: null, yhat: 1385, yhatLower: 1330, yhatUpper: 1435, isHistory: false }
        ]
      }
    })

    const option = wrapper.getComponent(AppLineChart).props('option')

    expect(option.yAxis.min).toBeGreaterThan(0)
    expect(option.yAxis.min).toBeLessThan(980)
    expect(option.yAxis.max).toBeGreaterThan(1435)
  })

  it('keeps a zero baseline when the data includes true low-volume values', () => {
    const wrapper = mount(ForecastDailyChart, {
      props: {
        formatNumber,
        rows: [
          { ds: '2026-12-24', actualValue: 1210, yhat: 1195, yhatLower: 1110, yhatUpper: 1280, isHistory: true },
          { ds: '2026-12-25', actualValue: 0, yhat: 95, yhatLower: 30, yhatUpper: 150, isHistory: false },
          { ds: '2026-12-26', actualValue: null, yhat: 1180, yhatLower: 1090, yhatUpper: 1270, isHistory: false }
        ]
      }
    })

    const option = wrapper.getComponent(AppLineChart).props('option')

    expect(option.yAxis.min).toBe(0)
    expect(option.yAxis.max).toBeGreaterThan(1270)
  })
})
