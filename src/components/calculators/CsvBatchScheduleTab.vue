<script setup>
import { computed } from 'vue'

import AppSectionHeader from '../ui/AppSectionHeader.vue'

const props = defineProps({
  summary: {
    type: Object,
    default: null
  },
  scheduleTotals: {
    type: Object,
    required: true
  },
  scheduleCoverageChart: {
    type: Object,
    required: true
  },
  activeSchedulePointIndex: {
    type: Number,
    default: null
  },
  activeSchedulePoint: {
    type: Object,
    default: null
  },
  scheduleTimeline: {
    type: Object,
    default: null
  },
  scheduleGanttRows: {
    type: Array,
    default: () => []
  },
  shiftPlan: {
    type: Array,
    default: () => []
  },
  schedulePeakCoverage: {
    type: Number,
    default: 0
  },
  formatCount: {
    type: Function,
    required: true
  },
  formatDecimal: {
    type: Function,
    required: true
  },
  formatIntervalLabel: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['update:active-schedule-point-index'])

const setActivePoint = (index) => {
  emit('update:active-schedule-point-index', index)
}

const clearActivePoint = () => {
  emit('update:active-schedule-point-index', null)
}

const scheduleCards = computed(() => {
  const cards = [
    {
      label: 'Planned Shifts',
      value: props.formatCount(props.scheduleTotals.shiftCount),
      meta: 'total agent-shift assignments'
    },
    {
      label: 'Required Daily FTE',
      value: props.formatCount(props.summary?.requiredDailyFte ?? 0),
      meta:
        Number(props.summary?.hoursBasedRequiredDailyFte ?? 0) === Number(props.summary?.requiredDailyFte ?? 0)
          ? 'hours-based shrinkage baseline'
          : 'constrained full-shift target'
    },
    {
      label: 'Shift Start Times',
      value: props.formatCount(props.scheduleTotals.shiftStarts),
      meta: 'distinct optimized starts'
    },
    {
      label: 'Coverage Attainment',
      value: `${(props.scheduleTotals.coverageRate * 100).toFixed(1)}%`,
      meta: 'intervals fully covered'
    },
    {
      label: 'Net Coverage Variance',
      value: props.formatDecimal(props.scheduleTotals.overage - props.scheduleTotals.gap, 1),
      meta: 'overage minus gap (agents)'
    }
  ]

  if (
    Number(props.summary?.hoursBasedRequiredDailyFte ?? 0) !==
    Number(props.summary?.requiredDailyFte ?? 0)
  ) {
    cards.splice(2, 0, {
      label: 'Hours-Based Daily FTE',
      value: props.formatCount(props.summary?.hoursBasedRequiredDailyFte ?? 0),
      meta: 'demand hours / paid hours baseline'
    })
  }

  return cards
})
</script>

<template>
  <section class="results-tab-panel">
    <AppSectionHeader
      title="Optimized Shift Schedule"
      description="Planned coverage is generated from full shift span (paid hours + unpaid lunch)."
    />

    <p
      v-if="Array.isArray(props.summary?.scheduleNotes) && props.summary.scheduleNotes.length"
      class="helper-text"
    >
      {{ props.summary.scheduleNotes[0] }}
    </p>

    <div class="schedule-kpi-grid">
      <article v-for="card in scheduleCards" :key="card.label" class="metric-card">
        <p class="metric-label">{{ card.label }}</p>
        <p class="metric-value">{{ card.value }}</p>
        <p class="metric-meta">{{ card.meta }}</p>
      </article>
    </div>

    <div
      class="schedule-chart"
      role="img"
      aria-label="Stacked interval staffing requirement versus scheduled staff"
      @mouseleave="clearActivePoint"
    >
      <div v-if="props.activeSchedulePoint" class="schedule-tooltip" role="status" aria-live="polite">
        <p class="schedule-tooltip-title">{{ props.activeSchedulePoint.label }}</p>
        <p>Interval FTE Need: {{ props.formatDecimal(props.activeSchedulePoint.requiredAgents, 2) }}</p>
        <p>Shrinkage Add-On: {{ props.formatDecimal(props.activeSchedulePoint.shrinkageOverhead, 2) }}</p>
        <p>FTE With Shrinkage: {{ props.formatDecimal(props.activeSchedulePoint.requiredHeadcount, 2) }}</p>
        <p>Planned: {{ props.formatDecimal(props.activeSchedulePoint.plannedHeadcount, 2) }}</p>
        <p>
          Net Gap:
          {{ props.formatDecimal(props.activeSchedulePoint.coverageGap, 2) }}
          |
          Net Overage:
          {{ props.formatDecimal(props.activeSchedulePoint.coverageOverage, 2) }}
        </p>
      </div>

      <div class="schedule-plot">
        <svg
          v-if="props.scheduleCoverageChart"
          :viewBox="`0 0 ${props.scheduleCoverageChart.width} ${props.scheduleCoverageChart.height}`"
          preserveAspectRatio="xMinYMin meet"
        >
          <line
            class="schedule-plot-axis"
            :x1="props.scheduleCoverageChart.padding.left"
            :x2="props.scheduleCoverageChart.width - props.scheduleCoverageChart.padding.right"
            :y1="props.scheduleCoverageChart.height - props.scheduleCoverageChart.padding.bottom"
            :y2="props.scheduleCoverageChart.height - props.scheduleCoverageChart.padding.bottom"
          />
          <line
            class="schedule-plot-axis"
            :x1="props.scheduleCoverageChart.padding.left"
            :x2="props.scheduleCoverageChart.padding.left"
            :y1="props.scheduleCoverageChart.padding.top"
            :y2="props.scheduleCoverageChart.height - props.scheduleCoverageChart.padding.bottom"
          />

          <g v-for="tick in props.scheduleCoverageChart.yTicks" :key="`schedule-y-${tick.y}`">
            <line
              class="schedule-plot-grid-line"
              :x1="props.scheduleCoverageChart.padding.left"
              :x2="props.scheduleCoverageChart.width - props.scheduleCoverageChart.padding.right"
              :y1="tick.y"
              :y2="tick.y"
            />
            <text
              class="schedule-plot-ytick"
              :x="props.scheduleCoverageChart.padding.left - 10"
              :y="tick.y + 4"
              text-anchor="end"
            >
              {{ tick.value }}
            </text>
          </g>

          <rect
            v-for="point in props.scheduleCoverageChart.points"
            :key="`schedule-base-${point.intervalStart}`"
            class="schedule-plot-bar-base"
            :x="point.barX"
            :y="point.requiredAgentsY"
            :width="point.barWidth"
            :height="point.baseHeight"
            rx="2"
            ry="2"
          />
          <rect
            v-for="point in props.scheduleCoverageChart.points"
            :key="`schedule-overhead-${point.intervalStart}`"
            class="schedule-plot-bar-overhead"
            :x="point.barX"
            :y="point.requiredHeadcountY"
            :width="point.barWidth"
            :height="point.overheadHeight"
            rx="2"
            ry="2"
          />

          <path class="schedule-plot-line" :d="props.scheduleCoverageChart.plannedLinePath" />
          <circle
            v-for="point in props.scheduleCoverageChart.points"
            :key="`schedule-point-${point.intervalStart}`"
            class="schedule-plot-point"
            :class="{ active: props.activeSchedulePointIndex === point.index }"
            :cx="point.x"
            :cy="point.plannedY"
            r="4"
          />

          <line
            v-if="props.activeSchedulePoint"
            class="schedule-plot-focus-line"
            :x1="props.activeSchedulePoint.x"
            :x2="props.activeSchedulePoint.x"
            :y1="props.scheduleCoverageChart.padding.top"
            :y2="props.scheduleCoverageChart.height - props.scheduleCoverageChart.padding.bottom"
          />

          <rect
            v-for="point in props.scheduleCoverageChart.points"
            :key="`schedule-hover-${point.intervalStart}`"
            class="schedule-plot-hover-zone"
            :x="point.hoverX"
            :y="props.scheduleCoverageChart.padding.top"
            :width="point.hoverWidth"
            :height="props.scheduleCoverageChart.height - props.scheduleCoverageChart.padding.top - props.scheduleCoverageChart.padding.bottom"
            @mouseenter="setActivePoint(point.index)"
          />

          <text
            v-for="tick in props.scheduleCoverageChart.xTicks"
            :key="`schedule-x-${tick.x}`"
            :x="tick.x"
            :y="props.scheduleCoverageChart.height - props.scheduleCoverageChart.padding.bottom + 14"
            class="schedule-plot-tick-label"
            text-anchor="end"
            :transform="`rotate(-22 ${tick.x} ${props.scheduleCoverageChart.height - props.scheduleCoverageChart.padding.bottom + 14})`"
          >
            {{ tick.label }}
          </text>
        </svg>
      </div>
    </div>

    <div class="schedule-legend" aria-label="Schedule legend">
      <span class="schedule-legend-item">
        <span class="schedule-legend-swatch schedule-legend-required"></span>
        Interval FTE Need
      </span>
      <span class="schedule-legend-item">
        <span class="schedule-legend-swatch schedule-legend-overhead"></span>
        Shrinkage Overhead
      </span>
      <span class="schedule-legend-item">
        <span class="schedule-legend-line"></span>
        Scheduled Staff
      </span>
      <span class="schedule-legend-item">Peak {{ props.formatDecimal(props.schedulePeakCoverage, 1) }}</span>
    </div>

    <div v-if="props.scheduleTimeline && props.scheduleGanttRows.length" class="schedule-gantt">
      <div class="schedule-gantt-header">
        <h5>Agent Schedule View</h5>
        <p>
          Each row is one agent shift. Blue segments are paid work and amber segments are unpaid lunch.
        </p>
        <p>
          Lunch window:
          {{ props.formatDecimal(props.summary?.lunchWindowStartHours ?? 0, 1) }}h to
          {{ props.formatDecimal(props.summary?.lunchWindowEndHours ?? 0, 1) }}h into shift.
        </p>
      </div>
      <div class="schedule-gantt-axis">
        <span
          v-for="tick in props.scheduleTimeline.ticks"
          :key="`gantt-tick-${tick.index}`"
          class="schedule-gantt-tick"
          :style="{ left: `${(tick.index / props.scheduleTimeline.intervalCount) * 100}%` }"
        >
          {{ tick.label }}
        </span>
      </div>
      <div class="schedule-gantt-body">
        <div v-for="row in props.scheduleGanttRows" :key="row.rowId" class="schedule-gantt-row">
          <span class="schedule-gantt-agent">{{ row.agentId }}</span>
          <div class="schedule-gantt-track">
            <span
              v-for="(segment, segmentIndex) in row.segments"
              :key="`${row.rowId}-segment-${segmentIndex}`"
              :class="[
                'schedule-gantt-segment',
                segment.type === 'lunch' ? 'schedule-gantt-lunch' : 'schedule-gantt-work'
              ]"
              :style="{ left: `${segment.left}%`, width: `${segment.width}%` }"
            ></span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="props.shiftPlan.length" class="schedule-starts">
      <h5>Shift Starts</h5>
      <div class="schedule-start-chips">
        <span
          v-for="(shift, index) in props.shiftPlan"
          :key="`${shift.shiftStart}-${index}`"
          class="schedule-chip"
        >
          {{ props.formatIntervalLabel(shift.shiftStart) }} · {{ props.formatCount(shift.agents) }} agents
        </span>
      </div>
    </div>
  </section>
</template>
