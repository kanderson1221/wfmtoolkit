<script setup>
import { computed } from 'vue'

import { resolveAdaptiveYAxisBounds } from '../../forecasting/chartAxis'
import { formatNumber, parseForecastDateValue } from '../../forecasting/shared'
import { formatForecastAhtSeconds } from '../../forecasting/handleTimeAssumptions'
import AppLineChart from '../ui/AppLineChart.vue'

const props = defineProps({
  historicalRows: {
    type: Array,
    default: () => []
  },
  forecastRows: {
    type: Array,
    default: () => []
  }
})

const formatMonthAxis = (value) => {
  const parsed = parseForecastDateValue(value)

  if (!parsed) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit'
  }).format(parsed)
}

const buildSeriesMap = (rows = [], valueKey) => new Map(
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const monthStart = typeof row?.monthStart === 'string' ? row.monthStart : ''
      const value = Number(row?.[valueKey])

      if (!monthStart || !Number.isFinite(value)) {
        return null
      }

      return [monthStart, value]
    })
    .filter(Boolean)
)

const monthStarts = computed(() => {
  const values = new Set()

  ;(Array.isArray(props.historicalRows) ? props.historicalRows : []).forEach((row) => {
    if (typeof row?.monthStart === 'string' && row.monthStart) {
      values.add(row.monthStart)
    }
  })

  ;(Array.isArray(props.forecastRows) ? props.forecastRows : []).forEach((row) => {
    if (typeof row?.monthStart === 'string' && row.monthStart) {
      values.add(row.monthStart)
    }
  })

  return [...values].sort((left, right) => left.localeCompare(right))
})

const historicalMap = computed(() => buildSeriesMap(props.historicalRows, 'weightedAhtSeconds'))
const suggestedMap = computed(() => buildSeriesMap(props.forecastRows, 'suggestedAhtSeconds'))
const finalMap = computed(() => buildSeriesMap(props.forecastRows, 'assumedAhtSeconds'))
const overrideMap = computed(() => buildSeriesMap(props.forecastRows, 'overrideAhtSeconds'))
const pointSize = computed(() => (monthStarts.value.length > 18 ? 0 : 5))
const overrideCount = computed(() => overrideMap.value.size)
const shouldShowZoom = computed(() => monthStarts.value.length > 12)
const numericSeriesValues = computed(() => (
  [
    ...historicalMap.value.values(),
    ...suggestedMap.value.values(),
    ...finalMap.value.values(),
    ...overrideMap.value.values()
  ].filter((value) => Number.isFinite(value))
))

const yAxisBounds = computed(() => {
  return resolveAdaptiveYAxisBounds(numericSeriesValues.value, {
    emptyMax: 100,
    singleValuePaddingFloor: 5,
    paddingFloor: 5,
    nearZeroFloor: 30
  })
})

const chartOption = computed(() => ({
  animation: false,
  grid: {
    left: 58,
    right: 24,
    top: 18,
    bottom: monthStarts.value.length > 12 ? 84 : 42
  },
  tooltip: {
    trigger: 'axis',
    confine: true,
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    textStyle: {
      color: '#e2e8f0',
      fontFamily: 'inherit'
    },
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: '#0f172a',
        type: 'dashed'
      }
    },
    formatter: (params = []) => {
      const monthStart = params?.[0]?.axisValue || ''

      if (!monthStart) {
        return ''
      }

      const lines = [
        `<div class="font-semibold text-white">${formatMonthAxis(monthStart)}</div>`
      ]

      const historicalValue = historicalMap.value.get(monthStart)
      const suggestedValue = suggestedMap.value.get(monthStart)
      const finalValue = finalMap.value.get(monthStart)
      const overrideValue = overrideMap.value.get(monthStart)

      if (historicalValue != null) {
        lines.push(`<div>Historical Weighted AHT: ${formatForecastAhtSeconds(historicalValue)}</div>`)
      }

      if (suggestedValue != null) {
        lines.push(`<div>Suggested AHT: ${formatForecastAhtSeconds(suggestedValue)}</div>`)
      }

      if (finalValue != null) {
        lines.push(`<div>Final AHT: ${formatForecastAhtSeconds(finalValue)}</div>`)
      }

      if (overrideValue != null) {
        lines.push(`<div>Override: ${formatForecastAhtSeconds(overrideValue)}</div>`)
      }

      return lines.join('')
    }
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: monthStarts.value,
    axisLine: {
      lineStyle: {
        color: '#e2e8f0'
      }
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#64748b',
      fontSize: 11,
      fontWeight: 600,
      hideOverlap: true,
      formatter: (value) => formatMonthAxis(value)
    }
  },
  yAxis: {
    type: 'value',
    min: yAxisBounds.value.min,
    max: yAxisBounds.value.max,
    splitNumber: 5,
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#64748b',
      fontSize: 11,
      fontWeight: 600,
      formatter: (value) => formatNumber(Number(value), 0)
    },
    splitLine: {
      lineStyle: {
        color: '#e2e8f0'
      }
    }
  },
  dataZoom: shouldShowZoom.value
    ? [
        {
          type: 'slider',
          height: 18,
          bottom: 18,
          borderColor: '#cbd5e1',
          fillerColor: 'rgba(21, 57, 95, 0.12)',
          backgroundColor: '#f8fafc',
          handleStyle: {
            color: '#15395f'
          },
          moveHandleStyle: {
            color: '#15395f'
          },
          dataBackground: {
            lineStyle: {
              color: 'rgba(148, 163, 184, 0.7)'
            },
            areaStyle: {
              color: 'rgba(226, 232, 240, 0.9)'
            }
          }
        }
      ]
    : [],
  series: [
    {
      name: 'Historical Weighted AHT',
      type: 'line',
      connectNulls: false,
      smooth: 0.18,
      symbol: pointSize.value > 0 ? 'circle' : 'none',
      symbolSize: pointSize.value,
      data: monthStarts.value.map((monthStart) => historicalMap.value.get(monthStart) ?? null),
      lineStyle: {
        color: '#475569',
        width: 2
      },
      itemStyle: {
        color: '#475569'
      }
    },
    {
      name: 'Suggested AHT',
      type: 'line',
      connectNulls: false,
      smooth: 0.18,
      symbol: 'none',
      data: monthStarts.value.map((monthStart) => suggestedMap.value.get(monthStart) ?? null),
      lineStyle: {
        color: '#94a3b8',
        width: 2,
        type: 'dashed'
      }
    },
    {
      name: 'Final AHT',
      type: 'line',
      connectNulls: false,
      smooth: 0.18,
      symbol: pointSize.value > 0 ? 'circle' : 'none',
      symbolSize: pointSize.value,
      data: monthStarts.value.map((monthStart) => finalMap.value.get(monthStart) ?? null),
      lineStyle: {
        color: '#0f766e',
        width: 2.5
      },
      itemStyle: {
        color: '#0f766e'
      }
    },
    {
      name: 'Overridden Month',
      type: 'line',
      connectNulls: false,
      showSymbol: overrideCount.value > 0,
      symbol: 'diamond',
      symbolSize: 9,
      data: monthStarts.value.map((monthStart) => overrideMap.value.get(monthStart) ?? null),
      lineStyle: {
        opacity: 0
      },
      itemStyle: {
        color: '#0f766e',
        borderColor: '#ffffff',
        borderWidth: 1.5
      }
    }
  ]
}))
</script>

<template>
  <AppLineChart
    chart-id="forecast-monthly-aht-chart"
    aria-label="Monthly handle time forecast review"
    fallback-text="The monthly AHT chart could not be loaded."
    height-class="h-[21rem]"
    min-width-class="min-w-[720px]"
    :option="chartOption"
  />
</template>
