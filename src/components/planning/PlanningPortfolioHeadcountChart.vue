<script setup>
import { computed, ref } from 'vue'

import AppEmptyState from '../ui/AppEmptyState.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import { MONTH_LABELS } from '../../planner/shared'

const props = defineProps({
  planningYear: {
    type: Number,
    required: true
  },
  neededTotals: {
    type: Array,
    default: () => []
  },
  frontlineTotals: {
    type: Array,
    default: () => []
  },
  totalHeadcountTotals: {
    type: Array,
    default: () => []
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const chartWidth = 960
const chartHeight = 320
const chartPadding = {
  top: 20,
  right: 20,
  bottom: 50,
  left: 56
}

const niceChartMax = (value) => {
  const numericValue = Number(value) || 0
  if (numericValue <= 0) {
    return 1
  }

  const magnitude = 10 ** Math.floor(Math.log10(numericValue))
  const normalized = numericValue / magnitude

  if (normalized <= 1) return 1 * magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

const tooltipRef = ref(null)
const activeTooltip = ref(null)

const monthlyTotals = computed(() =>
  MONTH_LABELS.map((_, monthIndex) => Number(props.neededTotals?.[monthIndex]) || 0)
)

const chartMax = computed(() =>
  niceChartMax(
    Math.max(
      ...monthlyTotals.value,
      ...(Array.isArray(props.frontlineTotals) ? props.frontlineTotals : []),
      ...(Array.isArray(props.totalHeadcountTotals) ? props.totalHeadcountTotals : []),
      0
    )
  )
)

const yTicks = computed(() => {
  const tickCount = 4
  return Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = (chartMax.value / tickCount) * index
    const y =
      chartHeight -
      chartPadding.bottom -
      (value / chartMax.value) * (chartHeight - chartPadding.top - chartPadding.bottom)

    return {
      value,
      y
    }
  })
})

const scaleY = (value) =>
  chartHeight -
  chartPadding.bottom -
  ((Number(value) || 0) / chartMax.value) * (chartHeight - chartPadding.top - chartPadding.bottom)

const chartBars = computed(() => {
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const stepWidth = plotWidth / MONTH_LABELS.length
  const barWidth = Math.min(42, stepWidth * 0.62)

  return MONTH_LABELS.map((label, monthIndex) => {
    const x = chartPadding.left + monthIndex * stepWidth + (stepWidth - barWidth) / 2
    const total = Number(props.neededTotals?.[monthIndex]) || 0

    return {
      label,
      monthIndex,
      total,
      totalY: scaleY(total),
      totalX: x + barWidth / 2,
      x,
      width: barWidth,
      y: scaleY(total),
      height: Math.max(chartHeight - chartPadding.bottom - scaleY(total), 0)
    }
  })
})

const linePoints = computed(() =>
  chartBars.value.map((bar) => ({
    label: bar.label,
    monthIndex: bar.monthIndex,
    x: bar.totalX,
    neededHeadcount: bar.total,
    neededY: bar.totalY,
    frontlineHeadcount: Number(props.frontlineTotals?.[bar.monthIndex]) || 0,
    frontlineY: scaleY(props.frontlineTotals?.[bar.monthIndex] || 0),
    totalHeadcount: Number(props.totalHeadcountTotals?.[bar.monthIndex]) || 0,
    totalY: scaleY(props.totalHeadcountTotals?.[bar.monthIndex] || 0)
  }))
)

const buildLinePath = (type) =>
  linePoints.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${type === 'frontline' ? point.frontlineY : point.totalY}`)
    .join(' ')

const hasData = computed(() =>
  monthlyTotals.value.some((value) => value > 0) ||
  (Array.isArray(props.frontlineTotals) && props.frontlineTotals.some((value) => Number(value) > 0)) ||
  (Array.isArray(props.totalHeadcountTotals) && props.totalHeadcountTotals.some((value) => Number(value) > 0))
)

const updateTooltipPosition = (event) => {
  if (!tooltipRef.value || !activeTooltip.value) {
    return
  }

  const containerRect = tooltipRef.value.parentElement?.getBoundingClientRect?.()
  if (!containerRect) {
    return
  }

  const tooltipWidth = 220
  const tooltipHeight = 96
  const nextLeft = Math.min(
    Math.max(event.clientX - containerRect.left + 16, 12),
    containerRect.width - tooltipWidth - 12
  )
  const nextTop = Math.min(
    Math.max(event.clientY - containerRect.top - tooltipHeight - 10, 12),
    containerRect.height - tooltipHeight - 12
  )

  activeTooltip.value = {
    ...activeTooltip.value,
    left: nextLeft,
    top: nextTop
  }
}

const showSegmentTooltip = (bar, event) => {
  activeTooltip.value = {
    monthLabel: bar.label,
    neededHeadcount: bar.total,
    frontlineHeadcount: Number(props.frontlineTotals?.[bar.monthIndex]) || 0,
    totalHeadcount: Number(props.totalHeadcountTotals?.[bar.monthIndex]) || 0,
    left: 0,
    top: 0
  }

  updateTooltipPosition(event)
}

const showLineTooltip = (point, event) => {
  activeTooltip.value = {
    monthLabel: point.label,
    neededHeadcount: point.neededHeadcount,
    frontlineHeadcount: point.frontlineHeadcount,
    totalHeadcount: point.totalHeadcount,
    left: 0,
    top: 0
  }

  updateTooltipPosition(event)
}

const clearTooltip = () => {
  activeTooltip.value = null
}
</script>

<template>
  <section class="grid gap-4">
    <AppSectionHeader
      title="Monthly Headcount Need vs Staffing"
    />

    <AppEmptyState
      v-if="!hasData"
      title="No monthly headcount data"
      :description="`No staffing groups have modeled required headcount for ${props.planningYear}.`"
    />

    <div v-else class="grid gap-4">
      <div
        class="relative overflow-x-auto rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm"
        @mouseleave="clearTooltip"
      >
        <div
          v-if="activeTooltip"
          ref="tooltipRef"
          class="pointer-events-none absolute z-10 w-[220px] rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg"
          :style="{ left: `${activeTooltip.left}px`, top: `${activeTooltip.top}px` }"
          role="status"
          aria-live="polite"
        >
          <p class="mb-2 text-sm font-semibold text-slate-950">
            {{ activeTooltip.monthLabel }}
          </p>
          <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <span>Needed Headcount</span>
            <strong>{{ props.formatNumber(activeTooltip.neededHeadcount, 1) }}</strong>
            <span>Frontline Headcount</span>
            <strong>{{ props.formatNumber(activeTooltip.frontlineHeadcount, 1) }}</strong>
            <span>Total Headcount</span>
            <strong>{{ props.formatNumber(activeTooltip.totalHeadcount, 1) }}</strong>
          </div>
        </div>

        <svg
          :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
          class="block min-w-[920px]"
          role="img"
          :aria-label="`Monthly headcount need versus frontline and total staffing for ${props.planningYear}`"
        >
          <line
            v-for="tick in yTicks"
            :key="`grid-${tick.value}`"
            :x1="chartPadding.left"
            :x2="chartWidth - chartPadding.right"
            :y1="tick.y"
            :y2="tick.y"
            stroke="#e2e8f0"
            stroke-width="1"
          />

          <line
            :x1="chartPadding.left"
            :x2="chartPadding.left"
            :y1="chartPadding.top"
            :y2="chartHeight - chartPadding.bottom"
            stroke="#cbd5e1"
            stroke-width="1"
          />
          <line
            :x1="chartPadding.left"
            :x2="chartWidth - chartPadding.right"
            :y1="chartHeight - chartPadding.bottom"
            :y2="chartHeight - chartPadding.bottom"
            stroke="#cbd5e1"
            stroke-width="1"
          />

          <text
            v-for="tick in yTicks"
            :key="`tick-${tick.value}`"
            :x="chartPadding.left - 10"
            :y="tick.y + 4"
            text-anchor="end"
            fill="#64748b"
            font-size="12"
            font-weight="600"
          >
            {{ props.formatNumber(tick.value, 1) }}
          </text>

          <g v-for="bar in chartBars" :key="bar.label">
            <rect
              :x="bar.x"
              :y="bar.y"
              :width="bar.width"
              :height="bar.height"
              fill="#d7e1ec"
              rx="4"
              ry="4"
              tabindex="0"
              @mouseenter="showSegmentTooltip(bar, $event)"
              @mousemove="updateTooltipPosition($event)"
              @focus="showSegmentTooltip(bar, $event)"
              @blur="clearTooltip"
            >
              <title>{{ bar.label }} | Needed headcount {{ props.formatNumber(bar.total, 1) }}</title>
            </rect>

            <text
              v-if="bar.total > 0"
              :x="bar.totalX"
              :y="bar.totalY - 8"
              text-anchor="middle"
              fill="#475569"
              font-size="11"
              font-weight="600"
            >
              {{ props.formatNumber(bar.total, 1) }}
            </text>

            <text
              :x="bar.totalX"
              :y="chartHeight - chartPadding.bottom + 18"
              text-anchor="middle"
              fill="#64748b"
              font-size="12"
              font-weight="600"
            >
              {{ bar.label }}
            </text>
          </g>

          <path
            :d="buildLinePath('total')"
            fill="none"
            stroke="#64748b"
            stroke-width="2.5"
            stroke-dasharray="6 4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            :d="buildLinePath('frontline')"
            fill="none"
            stroke="#15395f"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <circle
            v-for="point in linePoints"
            :key="`total-${point.monthIndex}`"
            :cx="point.x"
            :cy="point.totalY"
            r="4"
            fill="#64748b"
            stroke="#ffffff"
            stroke-width="2"
            tabindex="0"
            @mouseenter="showLineTooltip(point, $event)"
            @mousemove="updateTooltipPosition($event)"
            @focus="showLineTooltip(point, $event)"
            @blur="clearTooltip"
          />
          <circle
            v-for="point in linePoints"
            :key="`frontline-${point.monthIndex}`"
            :cx="point.x"
            :cy="point.frontlineY"
            r="4"
            fill="#15395f"
            stroke="#ffffff"
            stroke-width="2"
            tabindex="0"
            @mouseenter="showLineTooltip(point, $event)"
            @mousemove="updateTooltipPosition($event)"
            @focus="showLineTooltip(point, $event)"
            @blur="clearTooltip"
          />
        </svg>
      </div>

      <div class="flex flex-wrap gap-2.5">
        <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
          <span class="h-2.5 w-2.5 rounded-sm bg-[#d7e1ec]" aria-hidden="true" />
          <span class="font-medium text-slate-900">Needed Headcount</span>
        </div>
        <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
          <span class="h-0 w-5 border-t-2 border-[#15395f]" aria-hidden="true" />
          <span class="font-medium text-slate-900">Frontline Headcount</span>
        </div>
        <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
          <span class="h-0 w-5 border-t-2 border-dashed border-slate-500" aria-hidden="true" />
          <span class="font-medium text-slate-900">Total Headcount</span>
        </div>
      </div>
    </div>
  </section>
</template>
