<script setup>
import { computed } from 'vue'

import { parseForecastDateValue } from '../../forecasting/shared'
import AppLineChart from '../ui/AppLineChart.vue'

const props = defineProps({
  points: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const formatAxisLabel = (value) => {
  const parsed = parseForecastDateValue(value)
  if (!parsed) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(parsed)
}

const chartPoints = computed(() =>
  (props.points || []).map((point) => ({
    label: point.label || point.ds || '',
    value: Number(point.value) || 0
  }))
)

const pointSize = computed(() => (chartPoints.value.length > 80 ? 0 : 5))
const axisLabels = computed(() => chartPoints.value.map((point) => point.label))
const shouldShowZoom = computed(() => chartPoints.value.length > 40)

const chartOption = computed(() => ({
  animation: false,
  grid: {
    left: 56,
    right: 18,
    top: 20,
    bottom: shouldShowZoom.value ? 64 : 26
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
      const point = chartPoints.value[dataIndex]
      if (!point) {
        return ''
      }

      return [
        `<div class="font-semibold text-white">${point.label}</div>`,
        `<div>${props.title}: ${props.formatNumber(point.value, 1)}</div>`
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
      formatter: (value) => formatAxisLabel(value)
    }
  },
  yAxis: {
    type: 'value',
    scale: true,
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
      formatter: (value) => props.formatNumber(Number(value), 1)
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
          type: 'inside',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false
        },
        {
          type: 'slider',
          height: 16,
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
      name: props.title,
      type: 'line',
      smooth: 0.22,
      symbol: pointSize.value > 0 ? 'circle' : 'none',
      symbolSize: pointSize.value,
      data: chartPoints.value.map((point) => point.value),
      lineStyle: {
        color: '#0e7490',
        width: 2.5
      },
      itemStyle: {
        color: '#0e7490'
      }
    }
  ]
}))
</script>

<template>
  <AppLineChart
    :chart-id="`${props.title.toLowerCase().replace(/\s+/g, '-')}-chart`"
    :aria-label="props.title"
    fallback-text="The component chart could not be loaded."
    height-class="h-[14rem]"
    min-width-class="min-w-[720px]"
    :option="chartOption"
  />
</template>
