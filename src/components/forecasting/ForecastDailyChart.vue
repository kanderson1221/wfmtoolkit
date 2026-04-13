<script setup>
import { computed } from 'vue'

import { formatDate, parseForecastDateValue } from '../../forecasting/shared'
import AppLineChart from '../ui/AppLineChart.vue'

const props = defineProps({
  rows: {
    type: Array,
    default: () => []
  },
  holdoutDays: {
    type: Number,
    default: 0
  },
  formatNumber: {
    type: Function,
    required: true
  },
  heightClass: {
    type: String,
    default: 'h-[20rem]'
  },
  minWidthClass: {
    type: String,
    default: 'min-w-[920px]'
  },
  showLegend: {
    type: Boolean,
    default: true
  }
})

const formatAxisDate = (value) => {
  const parsed = parseForecastDateValue(value)
  if (!parsed) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(parsed)
}

const chartRows = computed(() => props.rows || [])
const cutoffIndex = computed(() => chartRows.value.findIndex((row) => !row.isHistory))
const holdoutStartIndex = computed(() => {
  if (props.holdoutDays <= 0 || cutoffIndex.value <= 0) {
    return -1
  }

  return Math.max(cutoffIndex.value - Math.round(props.holdoutDays), 0)
})
const holdoutEndIndex = computed(() => (
  holdoutStartIndex.value > -1 && cutoffIndex.value > 0
    ? cutoffIndex.value - 1
    : -1
))
const pointSize = computed(() => (chartRows.value.length > 120 ? 0 : 5))
const axisLabels = computed(() => chartRows.value.map((row) => row.ds || ''))
const bandSpread = computed(() =>
  chartRows.value.map((row) => Math.max((Number(row.yhatUpper) || 0) - (Number(row.yhatLower) || 0), 0))
)
const shouldShowZoom = computed(() => chartRows.value.length > 45)
const hasHoldoutWindow = computed(() => holdoutStartIndex.value > -1 && holdoutEndIndex.value > -1)

const resolveWindowLabel = (dataIndex) => {
  if (!chartRows.value[dataIndex]) {
    return ''
  }

  if (!chartRows.value[dataIndex].isHistory) {
    return 'Forecast window'
  }

  if (hasHoldoutWindow.value && dataIndex >= holdoutStartIndex.value && dataIndex <= holdoutEndIndex.value) {
    return 'Test window'
  }

  return 'Training window'
}

const chartOption = computed(() => ({
  animation: false,
  grid: {
    left: 56,
    right: 18,
    top: 20,
    bottom: shouldShowZoom.value ? 68 : 26
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
    formatter: (params) => {
      const dataIndex = params?.[0]?.dataIndex ?? 0
      const row = chartRows.value[dataIndex]
      if (!row) {
        return ''
      }

      const lines = [
        `<div class="font-semibold text-white">${formatDate(row.ds)}</div>`,
        `<div>History: ${row.actualValue == null ? '—' : props.formatNumber(row.actualValue, 1)}</div>`,
        `<div>Forecast: ${props.formatNumber(row.yhat, 1)}</div>`,
        `<div>Lower: ${props.formatNumber(row.yhatLower, 1)}</div>`,
        `<div>Upper: ${props.formatNumber(row.yhatUpper, 1)}</div>`,
        `<div>${resolveWindowLabel(dataIndex)}</div>`
      ]

      return lines.join('')
    }
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: axisLabels.value,
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
      formatter: (value) => formatAxisDate(value)
    }
  },
  yAxis: {
    type: 'value',
    min: 0,
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
      formatter: (value) => props.formatNumber(Number(value), 0)
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
          borderColor: '#d7e2ec',
          fillerColor: 'rgba(16, 47, 79, 0.14)',
          backgroundColor: '#f8fafc',
          handleStyle: {
            color: '#15395f'
          }
        }
      ]
    : [],
  series: [
    {
      name: 'Lower bound',
      type: 'line',
      data: chartRows.value.map((row) => Number(row.yhatLower) || 0),
      stack: 'forecast-band',
      symbol: 'none',
      lineStyle: {
        opacity: 0
      },
      areaStyle: {
        opacity: 0
      },
      emphasis: {
        disabled: true
      }
    },
    {
      name: 'Uncertainty band',
      type: 'line',
      data: bandSpread.value,
      stack: 'forecast-band',
      symbol: 'none',
      lineStyle: {
        opacity: 0
      },
      areaStyle: {
        color: 'rgba(149, 188, 214, 0.32)'
      },
      emphasis: {
        disabled: true
      }
    },
    {
      name: 'Forecast',
      type: 'line',
      smooth: 0.22,
      symbol: pointSize.value > 0 ? 'circle' : 'none',
      symbolSize: pointSize.value,
      data: chartRows.value.map((row) => Number(row.yhat) || 0),
      lineStyle: {
        color: '#0e7490',
        width: 2.5
      },
      itemStyle: {
        color: '#0e7490'
      },
      markLine: cutoffIndex.value > -1
        ? {
            symbol: 'none',
            silent: true,
            label: {
              show: false
            },
            lineStyle: {
              color: '#0f172a',
              type: 'dashed',
              width: 1.5
            },
            data: [
              {
                xAxis: axisLabels.value[cutoffIndex.value]
              }
            ]
          }
        : undefined
    },
    {
      name: 'History',
      type: 'line',
      smooth: 0.12,
      connectNulls: false,
      symbol: pointSize.value > 0 ? 'circle' : 'none',
      symbolSize: pointSize.value,
      data: chartRows.value.map((row) => (row.actualValue == null ? null : Number(row.actualValue) || 0)),
      lineStyle: {
        color: '#15395f',
        width: 2.5
      },
      itemStyle: {
        color: '#15395f'
      },
      markArea: hasHoldoutWindow.value
        ? {
            silent: true,
            itemStyle: {
              color: 'rgba(245, 158, 11, 0.1)'
            },
            label: {
              show: true,
              position: 'insideTop',
              color: '#9a3412',
              fontSize: 11,
              fontWeight: 600,
              formatter: 'Test period'
            },
            data: [
              [
                {
                  xAxis: axisLabels.value[holdoutStartIndex.value]
                },
                {
                  xAxis: axisLabels.value[holdoutEndIndex.value]
                }
              ]
            ]
          }
        : undefined,
      markLine: hasHoldoutWindow.value
        ? {
            symbol: 'none',
            silent: true,
            label: {
              show: false
            },
            lineStyle: {
              color: '#f59e0b',
              type: 'dashed',
              width: 1.5
            },
            data: [
              {
                xAxis: axisLabels.value[holdoutStartIndex.value]
              }
            ]
          }
        : undefined
    }
  ]
}))
</script>

<template>
  <div class="forecast-chart-shell">
    <div v-if="props.showLegend" class="forecast-chart-legend">
      <span class="forecast-chart-legend-item">
        <span class="forecast-chart-swatch forecast-chart-swatch-actual"></span>
        History
      </span>
      <span class="forecast-chart-legend-item">
        <span class="forecast-chart-swatch forecast-chart-swatch-forecast"></span>
        Forecast
      </span>
      <span class="forecast-chart-legend-item">
        <span class="forecast-chart-swatch forecast-chart-swatch-band"></span>
        Uncertainty band
      </span>
      <span v-if="hasHoldoutWindow" class="forecast-chart-legend-item">
        <span class="forecast-chart-swatch forecast-chart-swatch-test"></span>
        Test period
      </span>
    </div>

    <AppLineChart
      chart-id="forecast-daily-history-chart"
      aria-label="Daily history and forecast chart"
      fallback-text="The daily forecast chart could not be loaded."
      :height-class="props.heightClass"
      :min-width-class="props.minWidthClass"
      :option="chartOption"
    />
  </div>
</template>
