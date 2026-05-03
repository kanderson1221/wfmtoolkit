<script setup>
import { computed } from 'vue'

import AppChart from '../ui/AppChart.vue'
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
  startingFrontlineTotals: {
    type: Array,
    default: () => []
  },
  frontlineAdditionTotals: {
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
  hireTotals: {
    type: Array,
    default: () => []
  },
  attritionTotals: {
    type: Array,
    default: () => []
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const toNumber = (value) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

const monthlyMovementRows = computed(() =>
  MONTH_LABELS.map((label, monthIndex) => {
    const opening = toNumber(props.startingFrontlineTotals?.[monthIndex])
    const additions = toNumber(props.frontlineAdditionTotals?.[monthIndex])
    const hiresStarted = toNumber(props.hireTotals?.[monthIndex])
    const attrition = toNumber(props.attritionTotals?.[monthIndex])
    const ending = toNumber(props.frontlineTotals?.[monthIndex])
    const required = toNumber(props.neededTotals?.[monthIndex])
    const roster = toNumber(props.totalHeadcountTotals?.[monthIndex])

    return {
      label,
      opening,
      additions,
      hiresStarted,
      attrition,
      ending,
      required,
      roster
    }
  })
)

const hasData = computed(() =>
  monthlyMovementRows.value.some((row) =>
    row.opening > 0 ||
    row.additions > 0 ||
    row.hiresStarted > 0 ||
    row.attrition > 0 ||
    row.ending > 0 ||
    row.required > 0 ||
    row.roster > 0
  )
)

const formatHeadcount = (value) => props.formatNumber(value, 1)

const waterfallSteps = computed(() =>
  monthlyMovementRows.value.flatMap((row) => [
    {
      row,
      step: 'opening',
      stepLabel: 'Opening Frontline',
      shortLabel: 'Open',
      categoryLabel: `${row.label} Opening`,
      offset: 0,
      value: row.opening
    },
    {
      row,
      step: 'additions',
      stepLabel: 'Frontline Additions',
      shortLabel: '+',
      categoryLabel: `${row.label} Additions`,
      offset: row.opening,
      value: row.additions
    },
    {
      row,
      step: 'attrition',
      stepLabel: 'Attrition',
      shortLabel: '-',
      categoryLabel: `${row.label} Attrition`,
      offset: row.ending,
      value: row.attrition
    },
    {
      row,
      step: 'ending',
      stepLabel: 'Ending Frontline',
      shortLabel: 'End',
      categoryLabel: `${row.label} Ending`,
      offset: 0,
      value: row.ending
    }
  ])
)

const buildTooltip = (params) => {
  const dataIndex = Array.isArray(params)
    ? params.find((item) => item?.dataIndex != null)?.dataIndex
    : params?.dataIndex
  const step = waterfallSteps.value[dataIndex]

  if (!step?.row) {
    return ''
  }

  const { row } = step
  const lines = [
    `<div class="font-semibold text-white">${row.label} ${props.planningYear} · ${step.stepLabel}</div>`,
    `<div>Opening frontline: ${formatHeadcount(row.opening)}</div>`,
    `<div>Frontline additions: +${formatHeadcount(row.additions)}</div>`,
    `<div>Attrition: -${formatHeadcount(row.attrition)}</div>`,
    `<div>Ending frontline: ${formatHeadcount(row.ending)}</div>`,
    `<div>Required headcount: ${formatHeadcount(row.required)}</div>`,
    `<div>Roster headcount: ${formatHeadcount(row.roster)}</div>`
  ]

  if (row.hiresStarted > 0) {
    lines.push(`<div>Hires started: ${formatHeadcount(row.hiresStarted)}</div>`)
  }

  return lines.join('')
}

const offsetBar = (data) => ({
  name: '__Waterfall Offset',
  type: 'bar',
  stack: 'waterfall',
  data,
  barWidth: 22,
  silent: true,
  legendHoverLink: false,
  tooltip: {
    show: false
  },
  itemStyle: {
    color: 'transparent',
    borderColor: 'transparent'
  },
  emphasis: {
    disabled: true
  }
})

const waterfallBar = ({ name, data, color, borderRadius = [4, 4, 2, 2] }) => ({
  name,
  type: 'bar',
  stack: 'waterfall',
  data,
  barWidth: 22,
  itemStyle: {
    color,
    borderColor: color,
    borderWidth: 1,
    borderRadius
  },
  emphasis: {
    focus: 'series',
    itemStyle: {
      shadowBlur: 10,
      shadowColor: 'rgba(15, 23, 42, 0.18)'
    }
  },
  z: 3
})

const lineSeries = ({ name, data, color, dashed = false }) => ({
  name,
  type: 'line',
  data,
  smooth: false,
  symbol: 'circle',
  symbolSize: 7,
  showSymbol: true,
  lineStyle: {
    color,
    width: 2.5,
    type: dashed ? 'dashed' : 'solid'
  },
  itemStyle: {
    color,
    borderColor: '#ffffff',
    borderWidth: 2
  },
  emphasis: {
    focus: 'series'
  },
  z: 6
})

const chartOption = computed(() => {
  const categories = waterfallSteps.value.map((step) => step.categoryLabel)
  const offsetData = waterfallSteps.value.map((step) => step.offset)
  const dataForStep = (stepName) =>
    waterfallSteps.value.map((step) => (step.step === stepName ? step.value : '-'))
  const requiredData = waterfallSteps.value.map((step) => step.row.required)
  const rosterData = waterfallSteps.value.map((step) => step.row.roster)

  return {
    animation: false,
    color: ['#15395f', '#15803d', '#e11d48', '#2563eb', '#0f172a', '#64748b'],
    grid: {
      left: 58,
      right: 24,
      top: 70,
      bottom: 52
    },
    legend: {
      top: 8,
      left: 6,
      itemWidth: 16,
      itemHeight: 10,
      itemGap: 16,
      textStyle: {
        color: '#334155',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 600
      },
      data: [
        'Opening Frontline',
        'Frontline Additions',
        'Attrition',
        'Ending Frontline',
        'Required Headcount',
        'Roster Headcount'
      ]
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#0f172a',
      borderColor: '#0f172a',
      textStyle: {
        color: '#e2e8f0',
        fontFamily: 'inherit',
        fontSize: 12
      },
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(15, 57, 95, 0.08)'
        }
      },
      formatter: buildTooltip
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: '#cbd5e1'
        }
      },
      axisLabel: {
        color: '#64748b',
        fontFamily: 'inherit',
        fontSize: 11,
        fontWeight: 700,
        interval: 0,
        formatter: (_value, index) => {
          const step = waterfallSteps.value[index]
          if (!step) {
            return ''
          }

          return step.step === 'opening'
            ? `${step.row.label}\n${step.shortLabel}`
            : step.shortLabel
        }
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      splitNumber: 4,
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#64748b',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 600,
        formatter: (value) => formatHeadcount(value)
      },
      splitLine: {
        lineStyle: {
          color: '#e2e8f0'
        }
      }
    },
    series: [
      offsetBar(offsetData),
      waterfallBar({
        name: 'Opening Frontline',
        data: dataForStep('opening'),
        color: '#15395f'
      }),
      waterfallBar({
        name: 'Frontline Additions',
        data: dataForStep('additions'),
        color: '#15803d'
      }),
      waterfallBar({
        name: 'Attrition',
        data: dataForStep('attrition'),
        color: '#e11d48',
        borderRadius: [2, 2, 4, 4]
      }),
      waterfallBar({
        name: 'Ending Frontline',
        data: dataForStep('ending'),
        color: '#2563eb'
      }),
      lineSeries({
        name: 'Required Headcount',
        data: requiredData,
        color: '#0f172a'
      }),
      lineSeries({
        name: 'Roster Headcount',
        data: rosterData,
        color: '#64748b',
        dashed: true
      })
    ]
  }
})
</script>

<template>
  <section class="grid gap-4">
    <AppSectionHeader
      title="Monthly Staffing Waterfall"
      :description="`Opening frontline headcount, additions, attrition, and ending frontline headcount for ${props.planningYear}.`"
    />

    <AppEmptyState
      v-if="!hasData"
      title="No monthly staffing waterfall data"
      :description="`No staffing groups have modeled staffing movement for ${props.planningYear}.`"
    />

    <AppChart
      v-else
      :option="chartOption"
      height-class="h-[25rem]"
      min-width-class="min-w-[1540px]"
      :aria-label="`Monthly staffing waterfall for ${props.planningYear}, showing opening frontline headcount, additions, attrition, ending frontline, required headcount, and roster headcount`"
      fallback-text="Monthly staffing waterfall chart could not be loaded."
    />
  </section>
</template>
