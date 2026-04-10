<script setup>
import { computed } from 'vue'

import { formatWhole, parseForecastDateValue } from '../../forecasting/shared'
import AppLineChart from '../ui/AppLineChart.vue'

const props = defineProps({
  rows: {
    type: Array,
    default: () => []
  }
})

const previewRows = computed(() =>
  (props.rows || []).map((row) => ({
    ds: row.ds || '',
    value: Number(row.y) || 0
  }))
)

const pointSize = computed(() => (previewRows.value.length > 90 ? 0 : 4))
const axisLabels = computed(() => previewRows.value.map((row) => row.ds))

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

const chartOption = computed(() => ({
  animation: false,
  grid: {
    left: 52,
    right: 18,
    top: 18,
    bottom: 30
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
      const row = previewRows.value[dataIndex]
      if (!row) {
        return ''
      }

      return [
        `<div class="font-semibold text-white">${formatAxisDate(row.ds)}</div>`,
        `<div>Contacts: ${formatWhole(row.value)}</div>`
      ].join('')
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
      formatter: (value) => formatWhole(Number(value))
    },
    splitLine: {
      lineStyle: {
        color: '#e2e8f0'
      }
    }
  },
  series: [
    {
      name: 'Contacts',
      type: 'line',
      smooth: 0.18,
      symbol: pointSize.value > 0 ? 'circle' : 'none',
      symbolSize: pointSize.value,
      data: previewRows.value.map((row) => row.value),
      lineStyle: {
        color: '#15395f',
        width: 2.5
      },
      itemStyle: {
        color: '#15395f'
      },
      areaStyle: {
        color: 'rgba(21, 57, 95, 0.08)'
      }
    }
  ]
}))
</script>

<template>
  <AppLineChart
    chart-id="forecast-history-preview-chart"
    aria-label="Historical daily contacts preview"
    fallback-text="The history preview chart could not be loaded."
    height-class="h-full min-h-0"
    :scrollable="false"
    :surface="false"
    :option="chartOption"
  />
</template>
