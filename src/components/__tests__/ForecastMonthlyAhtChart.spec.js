import { mount } from '@vue/test-utils'

import ForecastMonthlyAhtChart from '../forecasting/ForecastMonthlyAhtChart.vue'
import AppLineChart from '../ui/AppLineChart.vue'

describe('ForecastMonthlyAhtChart', () => {
  it('uses a tighter y-axis for AHT values that are comfortably above zero', () => {
    const monthStart = (index) => {
      const year = 2025 + Math.floor(index / 12)
      const month = (index % 12) + 1
      return `${year}-${String(month).padStart(2, '0')}-01`
    }

    const wrapper = mount(ForecastMonthlyAhtChart, {
      props: {
        historicalRows: Array.from({ length: 18 }, (_, index) => ({
          monthStart: monthStart(index),
          weightedAhtSeconds: 200 + index
        })),
        forecastRows: Array.from({ length: 18 }, (_, index) => ({
          monthStart: monthStart(index),
          suggestedAhtSeconds: 210 + index,
          assumedAhtSeconds: 215 + index
        }))
      }
    })

    const lineChart = wrapper.getComponent(AppLineChart)
    const option = lineChart.props('option')

    expect(option.yAxis.min).toBeGreaterThan(0)
    expect(option.yAxis.min).toBeLessThan(200)
    expect(option.yAxis.max).toBeGreaterThan(232)
    expect(option.dataZoom).toHaveLength(1)
    expect(option.dataZoom[0]).toMatchObject({
      type: 'slider'
    })
    expect(option.dataZoom[0].startValue).toBeUndefined()
    expect(option.dataZoom[0].endValue).toBeUndefined()
  })

  it('keeps a zero baseline when the AHT values include true low-end values', () => {
    const wrapper = mount(ForecastMonthlyAhtChart, {
      props: {
        historicalRows: [
          { monthStart: '2025-01-01', weightedAhtSeconds: 390 },
          { monthStart: '2025-02-01', weightedAhtSeconds: 405 }
        ],
        forecastRows: [
          { monthStart: '2025-03-01', suggestedAhtSeconds: 25, assumedAhtSeconds: 30 },
          { monthStart: '2025-04-01', suggestedAhtSeconds: 410, assumedAhtSeconds: 415 }
        ]
      }
    })

    const option = wrapper.getComponent(AppLineChart).props('option')

    expect(option.yAxis.min).toBe(0)
    expect(option.yAxis.max).toBeGreaterThan(415)
  })
})
