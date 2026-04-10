<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  LineChart,
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent
])

const props = defineProps({
  ariaDescribedby: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  chartId: {
    type: String,
    default: ''
  },
  option: {
    type: Object,
    required: true
  },
  fallbackText: {
    type: String,
    default: 'Chart could not be loaded.'
  },
  heightClass: {
    type: String,
    default: 'h-[20rem]'
  },
  minWidthClass: {
    type: String,
    default: ''
  },
  surface: {
    type: Boolean,
    default: true
  },
  scrollable: {
    type: Boolean,
    default: true
  },
  updateOptions: {
    type: Object,
    default: () => ({
      notMerge: false
    })
  }
})

const cloneChartValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(cloneChartValue)
  }

  if (value instanceof Date) {
    return new Date(value)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, cloneChartValue(entryValue)])
    )
  }

  return value
}

const chartOption = computed(() => cloneChartValue(props.option || {}))
const chartUpdateOptions = computed(() => cloneChartValue(props.updateOptions || { notMerge: false }))
const outerClass = computed(() => (props.scrollable ? 'overflow-x-auto' : 'h-full min-h-0'))
const surfaceClass = computed(() => [
  props.surface ? 'forecast-chart-surface' : '',
  props.heightClass,
  props.minWidthClass
])
</script>

<template>
  <div :class="outerClass">
    <div :class="surfaceClass">
      <VChart
        :id="props.chartId || undefined"
        class="h-full w-full"
        :option="chartOption"
        :update-options="chartUpdateOptions"
        autoresize
        :aria-label="props.ariaLabel || undefined"
        :aria-describedby="props.ariaDescribedby || undefined"
      >
        {{ props.fallbackText }}
      </VChart>
    </div>
  </div>
</template>
