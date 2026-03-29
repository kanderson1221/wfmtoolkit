<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const hoveredMonthIndex = ref(null)

const svgWidth = 760
const svgHeight = 220
const chartLeft = 68
const chartRight = 16
const chartTop = 14
const chartBottom = 28
const plotWidth = svgWidth - chartLeft - chartRight
const plotHeight = svgHeight - chartTop - chartBottom

const maxValue = computed(() => {
  const values = props.records.flatMap((record) => [
    record.actualRequiredHeadcount ?? 0,
    record.plannedRequiredHeadcount ?? 0
  ])

  return Math.max(1, ...values)
})

const roundUpAxisMax = (value) => {
  const roughStep = value / 4
  const magnitude = 10 ** Math.floor(Math.log10(roughStep || 1))
  const normalized = roughStep / magnitude

  const niceStep = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10

  const step = niceStep * magnitude
  return Math.max(step, Math.ceil(value / step) * step)
}

const axisMax = computed(() => roundUpAxisMax(maxValue.value))

const slotWidth = computed(() =>
  props.records.length > 0 ? plotWidth / props.records.length : plotWidth
)

const toY = (value) => {
  const safeValue = Number(value) || 0
  return chartTop + plotHeight - (safeValue / axisMax.value) * plotHeight
}

const barWidth = computed(() => Math.min(34, Math.max(16, slotWidth.value * 0.52 || 28)))

const chartPoints = computed(() =>
  props.records.map((record, index) => {
    const x = chartLeft + slotWidth.value * (index + 0.5)

    return {
      ...record,
      x,
      needY: toY(record.actualRequiredHeadcount),
      plannedY: toY(record.plannedRequiredHeadcount)
    }
  })
)

const yTicks = computed(() =>
  Array.from({ length: 5 }, (_, index) => {
    const value = axisMax.value * ((4 - index) / 4)

    return {
      value,
      y: toY(value)
    }
  })
)

const tooltipPoint = computed(() =>
  chartPoints.value.find((point) => point.monthIndex === hoveredMonthIndex.value) || null
)

const tooltipStyle = computed(() => {
  if (!tooltipPoint.value) {
    return {}
  }

  return {
    left: `${(tooltipPoint.value.x / svgWidth) * 100}%`
  }
})

const plannedPath = computed(() =>
  chartPoints.value
    .filter((point) => point.plannedRequiredHeadcount != null)
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.plannedY}`)
    .join(' ')
)

const showTooltip = (monthIndex) => {
  hoveredMonthIndex.value = monthIndex
}

const hideTooltip = () => {
  hoveredMonthIndex.value = null
}
</script>

<template>
  <div class="actuals-chart-shell">
    <div class="actuals-chart-legend">
      <span class="actuals-legend-item">
        <span class="actuals-legend-swatch actuals-legend-swatch-need"></span>
        Actual Required Headcount
      </span>
      <span class="actuals-legend-item">
        <span class="actuals-legend-swatch actuals-legend-swatch-plan"></span>
        Planned Required Headcount
      </span>
    </div>

    <div class="actuals-chart-canvas">
      <div
        v-if="tooltipPoint"
        class="actuals-chart-tooltip"
        :style="tooltipStyle"
      >
        <strong class="actuals-chart-tooltip-title">{{ tooltipPoint.fullLabel }}</strong>
        <div class="actuals-chart-tooltip-grid">
          <span>Planned Required Headcount</span>
          <strong>{{ props.formatNumber(tooltipPoint.plannedRequiredHeadcount, 1) }}</strong>
          <span>Actual Required Headcount</span>
          <strong>
            {{
              tooltipPoint.actualRequiredHeadcount == null
                ? 'No actuals'
                : props.formatNumber(tooltipPoint.actualRequiredHeadcount, 1)
            }}
          </strong>
        </div>
      </div>

      <svg
        class="actuals-chart-svg"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        role="img"
        aria-label="Actual required headcount and planned required headcount by month"
      >
        <line
          :x1="chartLeft"
          :y1="chartTop"
          :x2="chartLeft"
          :y2="chartTop + plotHeight"
          class="actuals-chart-axis"
        />

        <line
          :x1="chartLeft"
          :y1="chartTop + plotHeight"
          :x2="svgWidth - chartRight"
          :y2="chartTop + plotHeight"
          class="actuals-chart-axis"
        />

        <text
          :x="14"
          :y="chartTop + plotHeight / 2"
          class="actuals-chart-axis-title"
          :transform="`rotate(-90 14 ${chartTop + plotHeight / 2})`"
        >
          Required Headcount
        </text>

        <g v-for="tick in yTicks" :key="`tick-${tick.value}`">
          <line
            :x1="chartLeft"
            :y1="tick.y"
            :x2="svgWidth - chartRight"
            :y2="tick.y"
            class="actuals-chart-grid"
          />
          <text
            :x="chartLeft - 8"
            :y="tick.y + 4"
            class="actuals-chart-tick-label"
          >
            {{ props.formatNumber(tick.value, 0) }}
          </text>
        </g>

        <g v-for="point in chartPoints" :key="point.label">
          <rect
            :x="point.x - slotWidth / 2"
            :y="chartTop"
            :width="Math.max(24, slotWidth)"
            :height="plotHeight"
            class="actuals-chart-hitbox"
            tabindex="0"
            @mouseenter="showTooltip(point.monthIndex)"
            @mouseleave="hideTooltip"
            @focus="showTooltip(point.monthIndex)"
            @blur="hideTooltip"
          />

          <rect
            v-if="point.actualRequiredHeadcount != null"
            :x="point.x - barWidth / 2"
            :y="point.needY"
            :width="barWidth"
            :height="chartTop + plotHeight - point.needY"
            class="actuals-chart-bar"
            rx="10"
          />

          <text :x="point.x" :y="svgHeight - 6" class="actuals-chart-label">
            {{ point.label }}
          </text>
        </g>

        <path v-if="plannedPath" :d="plannedPath" class="actuals-chart-line actuals-chart-line-plan" />

        <template v-for="point in chartPoints" :key="`${point.label}-planned-point`">
          <circle
            v-if="point.plannedRequiredHeadcount != null"
            :cx="point.x"
            :cy="point.plannedY"
            r="4"
            class="actuals-chart-point actuals-chart-point-plan"
          />
        </template>
      </svg>
    </div>
  </div>
</template>
