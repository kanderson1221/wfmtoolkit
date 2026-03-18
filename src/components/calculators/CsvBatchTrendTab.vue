<script setup>
import AppSectionHeader from '../ui/AppSectionHeader.vue'

const props = defineProps({
  chartMeta: {
    type: Object,
    required: true
  },
  trendChart: {
    type: Object,
    required: true
  },
  selectedMode: {
    type: String,
    required: true
  },
  activeChartPointIndex: {
    type: Number,
    default: null
  },
  activeChartPoint: {
    type: Object,
    default: null
  },
  activeChartTooltip: {
    type: Object,
    default: null
  },
  formatCount: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['update:active-chart-point-index'])

const setActivePoint = (index) => {
  emit('update:active-chart-point-index', index)
}

const clearActivePoint = () => {
  emit('update:active-chart-point-index', null)
}
</script>

<template>
  <section class="results-tab-panel">
    <AppSectionHeader
      :title="props.chartMeta.title"
      :description="props.chartMeta.description"
    />

    <div class="trend-chart">
      <svg
        :viewBox="`0 0 ${props.trendChart.width} ${props.trendChart.height}`"
        role="img"
        aria-label="Mode-aware staffing trend chart"
        @mouseleave="clearActivePoint"
      >
        <line
          v-for="tick in props.trendChart.yTicks"
          :key="`grid-${tick.y}`"
          :x1="props.trendChart.padding.left"
          :y1="tick.y"
          :x2="props.trendChart.width - props.trendChart.padding.right"
          :y2="tick.y"
          class="trend-grid-line"
        />

        <line
          :x1="props.trendChart.padding.left"
          :y1="props.trendChart.padding.top"
          :x2="props.trendChart.padding.left"
          :y2="props.trendChart.height - props.trendChart.padding.bottom"
          class="trend-axis"
        />
        <line
          :x1="props.trendChart.width - props.trendChart.padding.right"
          :y1="props.trendChart.padding.top"
          :x2="props.trendChart.width - props.trendChart.padding.right"
          :y2="props.trendChart.height - props.trendChart.padding.bottom"
          class="trend-axis"
        />
        <line
          :x1="props.trendChart.padding.left"
          :y1="props.trendChart.height - props.trendChart.padding.bottom"
          :x2="props.trendChart.width - props.trendChart.padding.right"
          :y2="props.trendChart.height - props.trendChart.padding.bottom"
          class="trend-axis"
        />

        <text
          v-for="tick in props.trendChart.yTicks"
          :key="`line-y-${tick.y}`"
          :x="props.trendChart.padding.left - 10"
          :y="tick.y + 4"
          class="trend-ytick trend-ytick-calls"
          text-anchor="end"
        >
          {{ tick.lineValue }}
        </text>
        <text
          v-for="tick in props.trendChart.yTicks"
          :key="`bar-y-${tick.y}`"
          :x="props.trendChart.width - props.trendChart.padding.right + 10"
          :y="tick.y + 4"
          class="trend-ytick trend-ytick-staff"
          text-anchor="start"
        >
          {{ tick.barValue }}
        </text>

        <template v-if="props.selectedMode === 'daily-plan'">
          <rect
            v-for="point in props.trendChart.points"
            :key="`bar-base-${point.x}`"
            :x="point.barX"
            :y="point.requiredAgentsY"
            :width="point.barWidth"
            :height="point.requiredAgentsHeight"
            :class="[
              'trend-bar',
              'trend-bar-staff-base',
              { active: props.activeChartPointIndex === point.index }
            ]"
          >
            <title>{{ point.label }} | Required Agents: {{ props.formatCount(point.requiredAgents) }}</title>
          </rect>
          <rect
            v-for="point in props.trendChart.points"
            :key="`bar-addon-${point.x}`"
            :x="point.barX"
            :y="point.requiredHeadcountY"
            :width="point.barWidth"
            :height="point.headcountAddonHeight"
            :class="[
              'trend-bar',
              'trend-bar-staff-addon',
              { active: props.activeChartPointIndex === point.index }
            ]"
          >
            <title>
              {{ point.label }} | Headcount Add-On: {{ props.formatCount(point.headcountAddon) }} | Required
              Headcount: {{ props.formatCount(point.barValue) }}
            </title>
          </rect>
          <rect
            v-for="point in props.trendChart.points"
            :key="`hover-zone-${point.x}`"
            class="trend-hover-zone"
            :x="point.hoverX"
            :y="props.trendChart.padding.top"
            :width="point.hoverWidth"
            :height="props.trendChart.height - props.trendChart.padding.top - props.trendChart.padding.bottom"
            tabindex="0"
            role="button"
            :aria-label="`Show interval details for ${point.label}`"
            @mouseenter="setActivePoint(point.index)"
            @focus="setActivePoint(point.index)"
            @blur="clearActivePoint"
          />
        </template>
        <template v-else>
          <rect
            v-for="point in props.trendChart.points"
            :key="`bar-${point.x}`"
            :x="point.barX"
            :y="point.barY"
            :width="point.barWidth"
            :height="point.barHeight"
            class="trend-bar trend-bar-staff-base"
          >
            <title>{{ point.label }} | {{ props.chartMeta.barLegend }}: {{ props.formatCount(point.barValue) }}</title>
          </rect>
        </template>

        <line
          v-if="props.selectedMode === 'daily-plan' && props.activeChartPoint"
          :x1="props.activeChartPoint.x"
          :x2="props.activeChartPoint.x"
          :y1="props.trendChart.padding.top"
          :y2="props.trendChart.height - props.trendChart.padding.bottom"
          class="trend-focus-line"
        />

        <path :d="props.trendChart.linePath" class="trend-line trend-line-calls" />
        <circle
          v-for="point in props.trendChart.points"
          :key="`line-point-${point.x}`"
          :cx="point.x"
          :cy="point.lineY"
          :class="[
            'trend-point',
            'trend-point-calls',
            { active: props.selectedMode === 'daily-plan' && props.activeChartPointIndex === point.index }
          ]"
          r="4"
        >
          <title>{{ point.label }} | {{ props.chartMeta.lineLegend }}: {{ props.formatCount(point.lineValue) }}</title>
        </circle>

        <g v-if="props.activeChartTooltip" style="pointer-events: none;">
          <rect
            class="trend-tooltip-box"
            :x="props.activeChartTooltip.x"
            :y="props.activeChartTooltip.y"
            :width="props.activeChartTooltip.width"
            :height="props.activeChartTooltip.height"
            rx="8"
            ry="8"
          />
          <text
            class="trend-tooltip-title"
            :x="props.activeChartTooltip.x + 10"
            :y="props.activeChartTooltip.y + 18"
          >
            {{ props.activeChartTooltip.label }}
          </text>
          <text
            class="trend-tooltip-text"
            :x="props.activeChartTooltip.x + 10"
            :y="props.activeChartTooltip.y + 40"
          >
            Calls Offered: {{ props.activeChartTooltip.callsOffered }}
          </text>
          <text
            class="trend-tooltip-text"
            :x="props.activeChartTooltip.x + 10"
            :y="props.activeChartTooltip.y + 56"
          >
            Required Agents: {{ props.activeChartTooltip.requiredAgents }}
          </text>
          <text
            class="trend-tooltip-text"
            :x="props.activeChartTooltip.x + 10"
            :y="props.activeChartTooltip.y + 72"
          >
            Headcount Add-On: {{ props.activeChartTooltip.headcountAddon }}
          </text>
          <text
            class="trend-tooltip-text"
            :x="props.activeChartTooltip.x + 10"
            :y="props.activeChartTooltip.y + 88"
          >
            Required Headcount: {{ props.activeChartTooltip.requiredHeadcount }}
          </text>
        </g>

        <text
          v-for="tick in props.trendChart.xTicks"
          :key="`tick-${tick.x}`"
          :x="tick.x"
          :y="props.trendChart.height - props.trendChart.padding.bottom + 14"
          class="trend-tick-label"
          text-anchor="end"
          :transform="`rotate(-22 ${tick.x} ${props.trendChart.height - props.trendChart.padding.bottom + 14})`"
        >
          {{ tick.label }}
        </text>

        <text
          :x="22"
          :y="props.trendChart.height / 2"
          class="trend-axis-label trend-axis-label-y"
          text-anchor="middle"
          :transform="`rotate(-90 22 ${props.trendChart.height / 2})`"
        >
          {{ props.chartMeta.leftAxis }}
        </text>
        <text
          :x="props.trendChart.width - 18"
          :y="props.trendChart.height / 2"
          class="trend-axis-label trend-axis-label-y-right"
          text-anchor="middle"
          :transform="`rotate(90 ${props.trendChart.width - 18} ${props.trendChart.height / 2})`"
        >
          {{ props.chartMeta.rightAxis }}
        </text>
      </svg>
    </div>

    <div class="trend-legend" aria-label="Chart legend">
      <span class="trend-legend-item">
        <span class="trend-key trend-key-line-calls"></span>
        <span class="trend-key-point trend-key-point-calls"></span>
        {{ props.chartMeta.lineLegend }}
      </span>
      <span class="trend-legend-item" v-if="props.selectedMode === 'daily-plan'">
        <span class="trend-key trend-key-staff-base"></span>
        {{ props.chartMeta.barLegend }}
      </span>
      <span class="trend-legend-item" v-if="props.selectedMode === 'daily-plan'">
        <span class="trend-key trend-key-staff-addon"></span>
        {{ props.chartMeta.addonLegend }}
      </span>
      <span class="trend-legend-item" v-if="props.selectedMode !== 'daily-plan'">
        <span class="trend-key trend-key-staff-base"></span>
        {{ props.chartMeta.barLegend }}
      </span>
    </div>
  </section>
</template>
