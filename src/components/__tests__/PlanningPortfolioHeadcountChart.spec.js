import { mount } from '@vue/test-utils'

import PlanningPortfolioHeadcountChart from '../planning/PlanningPortfolioHeadcountChart.vue'

const formatNumber = (value, digits = 1) => Number(value || 0).toFixed(digits)

const AppChartStub = {
  name: 'AppChart',
  props: ['ariaLabel', 'heightClass', 'minWidthClass', 'option'],
  template: '<section />'
}

const AppEmptyStateStub = {
  name: 'AppEmptyState',
  props: ['title', 'description'],
  template: '<section><h2>{{ title }}</h2><p>{{ description }}</p></section>'
}

const AppSectionHeaderStub = {
  name: 'AppSectionHeader',
  props: ['title', 'description'],
  template: '<header><h2>{{ title }}</h2><p>{{ description }}</p></header>'
}

const buildSeries = (firstValue, fallback = 0) => [
  firstValue,
  ...Array.from({ length: 11 }, () => fallback)
]

const mountChart = (props = {}) =>
  mount(PlanningPortfolioHeadcountChart, {
    props: {
      planningYear: 2026,
      formatNumber,
      neededTotals: buildSeries(52),
      startingFrontlineTotals: buildSeries(50),
      frontlineAdditionTotals: buildSeries(7),
      frontlineTotals: buildSeries(54),
      totalHeadcountTotals: buildSeries(60),
      hireTotals: buildSeries(9),
      attritionTotals: buildSeries(3),
      ...props
    },
    global: {
      stubs: {
        AppChart: AppChartStub,
        AppEmptyState: AppEmptyStateStub,
        AppSectionHeader: AppSectionHeaderStub
      }
    }
  })

describe('PlanningPortfolioHeadcountChart', () => {
  it('builds an ECharts waterfall where attrition subtracts from ending headcount', () => {
    const wrapper = mountChart()
    const option = wrapper.getComponent(AppChartStub).props('option')
    const seriesByName = Object.fromEntries(option.series.map((series) => [series.name, series]))

    expect(option.xAxis.data.slice(0, 4)).toEqual([
      'Jan Opening',
      'Jan Additions',
      'Jan Attrition',
      'Jan Ending'
    ])
    expect(option.series[0].name).toBe('__Waterfall Offset')
    expect(option.series[0].data.slice(0, 4)).toEqual([0, 50, 54, 0])
    expect(seriesByName['Opening Frontline'].data.slice(0, 4)).toEqual([50, '-', '-', '-'])
    expect(seriesByName['Frontline Additions'].data.slice(0, 4)).toEqual(['-', 7, '-', '-'])
    expect(seriesByName.Attrition.data.slice(0, 4)).toEqual(['-', '-', 3, '-'])
    expect(seriesByName['Ending Frontline'].data.slice(0, 4)).toEqual(['-', '-', '-', 54])
    expect(seriesByName.Attrition.stack).toBe('waterfall')
    expect(seriesByName['Frontline Additions'].stack).toBe('waterfall')
  })

  it('describes attrition as a negative movement in the tooltip', () => {
    const wrapper = mountChart()
    const option = wrapper.getComponent(AppChartStub).props('option')
    const tooltip = option.tooltip.formatter([{ dataIndex: 2 }])

    expect(tooltip).toContain('Jan 2026 · Attrition')
    expect(tooltip).toContain('Frontline additions: +7.0')
    expect(tooltip).toContain('Attrition: -3.0')
    expect(tooltip).toContain('Ending frontline: 54.0')
    expect(tooltip).toContain('Hires started: 9.0')
  })

  it('shows an empty state when no movement data exists', () => {
    const wrapper = mountChart({
      neededTotals: [],
      startingFrontlineTotals: [],
      frontlineAdditionTotals: [],
      frontlineTotals: [],
      totalHeadcountTotals: [],
      hireTotals: [],
      attritionTotals: []
    })

    expect(wrapper.findComponent(AppChartStub).exists()).toBe(false)
    expect(wrapper.text()).toContain('No monthly staffing waterfall data')
  })
})
