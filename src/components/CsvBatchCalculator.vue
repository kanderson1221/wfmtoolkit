<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from 'vue'

const BASE_REQUIRED_HEADERS = [
  'queue_id',
  'interval_start',
  'calls_offered',
  'aht_seconds'
]

const EXTENDED_REQUIRED_HEADERS = [
  'mean_patience_seconds',
  'service_level_threshold',
  'service_level_target_seconds',
  'max_occupancy'
]

const WORKFLOWS = [
  {
    id: 'file-processor',
    label: 'File Processor',
    summary:
      'Upload a CSV of interval demand and return an enriched file with required agents, required headcount, and core service metrics for every row.',
    endpoint: '/api/erlang-c/batch/file-processor',
    templateHref: '/erlang_file_processor_template.csv',
    runLabel: 'Run File Processor',
    exportLabel: 'Export Staffing File',
    exportKey: 'enrichedFile',
    exportFilename: 'enriched_staffing_results.csv'
  },
  {
    id: 'daily-plan',
    label: 'Plan A Day',
    summary:
      'Build a staffing plan for one service day by converting interval demand into required agents, required headcount, and daily workload totals.',
    endpoint: '/api/erlang-c/batch/daily-plan',
    templateHref: '/erlang_daily_plan_template.csv',
    runLabel: 'Build Plan',
    exportLabel: 'Export Daily Plan',
    exportKey: 'dailyPlan',
    exportFilename: 'daily_staffing_plan.csv'
  },
  {
    id: 'weekly-plan',
    label: 'Weekly Plan Builder',
    summary:
      'Create a day-level and week-level staffing view from multi-day interval files, including totals, variability, and exportable planning outputs.',
    endpoint: '/api/erlang-c/batch/weekly-plan',
    templateHref: '/erlang_weekly_plan_template.csv',
    runLabel: 'Build Weekly Plan',
    exportLabel: 'Export Weekly Plan',
    exportKey: 'weeklyPlan',
    exportFilename: 'weekly_staffing_plan.csv'
  }
]

const selectedMode = ref('file-processor')
const selectedFileName = ref('')
const parsedHeaders = ref([])
const parsedRows = ref([])
const parseError = ref('')
const submitError = ref('')
const isLoading = ref(false)
const hasSubmitted = ref(false)

const summary = ref(null)
const errors = ref([])
const results = ref([])
const calculatedRows = ref([])
const dailyBreakdown = ref([])
const exportData = ref({})
const activeResultsTab = ref('summary')
const focusedRowIndex = ref(null)

const dayPlannerInputs = reactive({
  assumptionSource: 'file',
  intervalDurationMinutes: 30
})

const weeklyPlannerInputs = reactive({
  shiftLengthHours: 8,
  productiveHoursPerDay: 6.5
})

const dailyGlobalAssumptions = reactive({
  meanPatienceSeconds: '',
  serviceLevelThreshold: '',
  serviceLevelTargetSeconds: '',
  maxOccupancy: '',
  shrinkage: ''
})

const currentWorkflow = computed(
  () => WORKFLOWS.find((workflow) => workflow.id === selectedMode.value) ?? WORKFLOWS[0]
)
const useFileDailyAssumptions = computed(() => dayPlannerInputs.assumptionSource === 'file')

const parsedRowCount = computed(() => parsedRows.value.length)
const processedCount = computed(() => summary.value?.processedRows ?? 0)
const successfulCount = computed(() => summary.value?.successfulRows ?? 0)
const failedCount = computed(() => summary.value?.failedRows ?? errors.value.length)

const integerFormatter = new Intl.NumberFormat()

const formatCount = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0'
  return integerFormatter.format(Math.round(value))
}

const formatVolume = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0'
  if (Math.abs(value - Math.round(value)) < 0.001) {
    return integerFormatter.format(Math.round(value))
  }
  return value.toFixed(1)
}

const formatDecimal = (value, digits = 2) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0.00'
  return value.toFixed(digits)
}

const formatPercent = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unstable'
  return `${(value * 100).toFixed(1)}%`
}

const formatAsaSeconds = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unstable'
  return value.toFixed(1)
}

const formatIntervalLabel = (value) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  const parsedDate = new Date(value)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const timeMatch = value.match(/(\d{1,2}:\d{2}\s*[APMapm]{2})/)
  if (timeMatch) {
    return timeMatch[1].toUpperCase()
  }

  return value
}

const escapeCsvCell = (value) => {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const parseCsvLine = (line) => {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  if (inQuotes) {
    throw new Error('CSV contains an unmatched quote character.')
  }

  values.push(current)
  return values
}

const parseCsvText = (text) => {
  const lines = text.split(/\r?\n/)
  if (!lines.length || !lines[0].trim()) {
    throw new Error('CSV is empty.')
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())
  const missingHeaders = BASE_REQUIRED_HEADERS.filter((required) => !headers.includes(required))
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
  }

  const rows = []
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim()) continue

    const values = parseCsvLine(line)
    const row = {}
    headers.forEach((header, headerIndex) => {
      row[header] = (values[headerIndex] ?? '').trim()
    })
    rows.push(row)
  }

  return { headers, rows }
}

const hasValue = (value) => value !== '' && value !== null && value !== undefined

const normalizeOptionalNumber = (value, label) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    throw new Error(`${label} must be numeric.`)
  }
  return numeric
}

const resolveDailyGlobalOverrides = () => {
  const overrides = {}

  if (hasValue(dailyGlobalAssumptions.meanPatienceSeconds)) {
    const value = normalizeOptionalNumber(
      dailyGlobalAssumptions.meanPatienceSeconds,
      'Average Customer Patience'
    )
    if (value <= 0) throw new Error('Average Customer Patience must be > 0.')
    overrides.mean_patience_seconds = value
  }

  if (hasValue(dailyGlobalAssumptions.serviceLevelThreshold)) {
    const value = normalizeOptionalNumber(
      dailyGlobalAssumptions.serviceLevelThreshold,
      'Service Level Goal'
    )
    if (value <= 0) throw new Error('Service Level Goal must be > 0.')
    overrides.service_level_threshold = value
  }

  if (hasValue(dailyGlobalAssumptions.serviceLevelTargetSeconds)) {
    const value = normalizeOptionalNumber(
      dailyGlobalAssumptions.serviceLevelTargetSeconds,
      'Service Level Threshold'
    )
    if (value < 0) throw new Error('Service Level Threshold must be >= 0.')
    overrides.service_level_target_seconds = value
  }

  if (hasValue(dailyGlobalAssumptions.maxOccupancy)) {
    const value = normalizeOptionalNumber(
      dailyGlobalAssumptions.maxOccupancy,
      'Max Occupancy'
    )
    if (value <= 0) throw new Error('Max Occupancy must be > 0.')
    overrides.max_occupancy = value
  }

  if (hasValue(dailyGlobalAssumptions.shrinkage)) {
    const value = normalizeOptionalNumber(dailyGlobalAssumptions.shrinkage, 'Shrinkage Assumption')
    if (value < 0 || value >= 100) {
      throw new Error('Shrinkage Assumption must be in [0, 100).')
    }
    overrides.shrinkage = value
  }

  return overrides
}

const missingHeadersForMode = (headers, mode, dailyOverrides) => {
  const headerSet = new Set(headers)

  if (mode === 'file-processor' || mode === 'weekly-plan') {
    return [...BASE_REQUIRED_HEADERS, ...EXTENDED_REQUIRED_HEADERS].filter(
      (required) => !headerSet.has(required)
    )
  }

  const requiredDailyHeaders = [
    ...BASE_REQUIRED_HEADERS,
    ...EXTENDED_REQUIRED_HEADERS.filter((field) => !hasValue(dailyOverrides[field]))
  ]

  return requiredDailyHeaders.filter((required) => !headerSet.has(required))
}

const rowsWithOverrides = (rows, overrides = null) =>
  rows.map((row) => {
    const normalized = { ...row }
    if (normalized.shrinkage === '') {
      delete normalized.shrinkage
    }
    if (!overrides) {
      return normalized
    }

    return {
      ...normalized,
      ...overrides
    }
  })

const downloadCsv = (filename, headers, rows) => {
  if (!headers?.length) return

  const csvRows = [headers.join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))]
  const blob = new Blob([`${csvRows.join('\n')}\n`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const resetOutputs = () => {
  hasSubmitted.value = false
  summary.value = null
  errors.value = []
  results.value = []
  calculatedRows.value = []
  dailyBreakdown.value = []
  exportData.value = {}
  activeResultsTab.value = 'summary'
  focusedRowIndex.value = null
  activeChartPointIndex.value = null
}

const setMode = (mode) => {
  if (mode === selectedMode.value) return
  selectedMode.value = mode
  parseError.value = ''
  submitError.value = ''
  resetOutputs()
}

const handleFileSelect = async (event) => {
  const input = event.target
  const file = input.files?.[0]
  parseError.value = ''
  submitError.value = ''
  resetOutputs()

  if (!file) {
    selectedFileName.value = ''
    parsedHeaders.value = []
    parsedRows.value = []
    return
  }

  selectedFileName.value = file.name
  try {
    const text = await file.text()
    const parsed = parseCsvText(text)
    if (!parsed.rows.length) {
      throw new Error('No data rows found in CSV.')
    }
    parsedHeaders.value = parsed.headers
    parsedRows.value = parsed.rows
  } catch (error) {
    parsedHeaders.value = []
    parsedRows.value = []
    parseError.value = error instanceof Error ? error.message : 'Unable to parse CSV file.'
  }
}

const runWorkflow = async () => {
  parseError.value = ''
  submitError.value = ''
  resetOutputs()

  if (!parsedRows.value.length) {
    parseError.value = 'Upload a valid CSV file before running this workflow.'
    return
  }

  isLoading.value = true
  try {
    let dailyOverrides = null
    if (selectedMode.value === 'daily-plan' && !useFileDailyAssumptions.value) {
      dailyOverrides = resolveDailyGlobalOverrides()
    }

    const missingHeaders = missingHeadersForMode(
      parsedHeaders.value,
      selectedMode.value,
      dailyOverrides ?? {}
    )
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns for ${currentWorkflow.value.label}: ${missingHeaders.join(', ')}`)
    }

    const payload = {
      rows: rowsWithOverrides(parsedRows.value, dailyOverrides)
    }

    if (selectedMode.value === 'daily-plan') {
      const intervalDurationMinutes = Number(dayPlannerInputs.intervalDurationMinutes)
      if (!Number.isFinite(intervalDurationMinutes) || intervalDurationMinutes <= 0) {
        throw new Error('Interval duration must be > 0 minutes.')
      }

      payload.interval_duration_minutes = intervalDurationMinutes
    }

    if (selectedMode.value === 'weekly-plan') {
      payload.shift_length_hours = Number(weeklyPlannerInputs.shiftLengthHours)
      payload.productive_hours_per_day = Number(weeklyPlannerInputs.productiveHoursPerDay)
    }

    const response = await fetch(currentWorkflow.value.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null)
      const detail = errorPayload?.detail
      const detailText = typeof detail === 'string' ? detail : 'Unable to run selected workflow.'
      throw new Error(detailText)
    }

    const workflowPayload = await response.json()
    const workflowErrors = workflowPayload.errors ?? []
    const workflowResults = workflowPayload.results ?? []
    const workflowCalculatedRows = workflowPayload.calculatedRows ?? workflowResults
    summary.value = workflowPayload.summary ?? null
    errors.value = workflowErrors
    results.value = workflowResults
    calculatedRows.value = workflowCalculatedRows
    dailyBreakdown.value = workflowPayload.dailyBreakdown ?? []
    exportData.value = workflowPayload.export ?? {}
    focusedRowIndex.value = null
    hasSubmitted.value = true
    activeResultsTab.value =
      workflowErrors.length > 0 && workflowResults.length === 0 && workflowCalculatedRows.length === 0
        ? 'errors'
        : 'summary'
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Unable to run selected workflow.'
  } finally {
    isLoading.value = false
  }
}

const exportPrimary = () => {
  const exportKey = currentWorkflow.value.exportKey
  const exportBlock = exportData.value?.[exportKey]
  if (!exportBlock?.headers?.length) return
  downloadCsv(currentWorkflow.value.exportFilename, exportBlock.headers, exportBlock.rows ?? [])
}

const exportDailyBreakdown = () => {
  const exportBlock = exportData.value?.dailyBreakdown
  if (!exportBlock?.headers?.length) return
  downloadCsv('weekly_daily_breakdown.csv', exportBlock.headers, exportBlock.rows ?? [])
}

const primaryExportReady = computed(() => {
  const exportBlock = exportData.value?.[currentWorkflow.value.exportKey]
  return Array.isArray(exportBlock?.rows) && exportBlock.rows.length > 0
})

const weeklyBreakdownExportReady = computed(() => {
  const exportBlock = exportData.value?.dailyBreakdown
  return Array.isArray(exportBlock?.rows) && exportBlock.rows.length > 0
})

const chartMeta = computed(() => {
  if (selectedMode.value === 'daily-plan') {
    return {
      title: 'Interval Trend',
      description:
        'Stacked bars show required agents and headcount add-on from shrinkage. Line shows interval call volume.',
      leftAxis: 'Calls Offered',
      rightAxis: 'Required Headcount',
      lineLegend: 'Calls Offered',
      barLegend: 'Required Agents',
      addonLegend: 'Headcount Add-On'
    }
  }

  if (selectedMode.value === 'weekly-plan') {
    return {
      title: 'Weekly Staffing Trend',
      description: 'Bars show recommended daily FTE. Line shows required headcount-hours by day.',
      leftAxis: 'Headcount Hours',
      rightAxis: 'Daily FTE',
      lineLegend: 'Required Headcount Hours',
      barLegend: 'Recommended Daily FTE'
    }
  }

  return {
    title: 'Interval Trend',
    description: 'Bars show required headcount. Line shows interval call volume.',
    leftAxis: 'Calls Offered',
    rightAxis: 'Required Headcount',
    lineLegend: 'Calls Offered',
    barLegend: 'Required Headcount'
  }
})

const niceCeiling = (value) => {
  if (!Number.isFinite(value) || value <= 0) return 1
  if (value <= 10) return Math.ceil(value)

  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  if (normalized <= 1) return magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

const chartSeries = computed(() => {
  if (!hasSubmitted.value) return []
  if (selectedMode.value === 'file-processor') return []

  if (selectedMode.value === 'daily-plan') {
    return calculatedRows.value
      .map((row) => {
        const source = parsedRows.value[row.rowIndex - 1] ?? {}
        const requiredAgents = Number(row.requiredStaffNet)
        const requiredHeadcount = Number(row.requiredStaffGross)
        const headcountAddon = Math.max(0, requiredHeadcount - requiredAgents)
        return {
          label: formatIntervalLabel(row.intervalStart),
          lineValue: Number(source.calls_offered),
          barValue: requiredHeadcount,
          requiredAgents,
          headcountAddon
        }
      })
      .filter(
        (point) =>
          typeof point.label === 'string' &&
          point.label.length > 0 &&
          Number.isFinite(point.lineValue) &&
          Number.isFinite(point.barValue) &&
          Number.isFinite(point.requiredAgents) &&
          Number.isFinite(point.headcountAddon)
      )
  }

  if (selectedMode.value === 'weekly-plan') {
    return results.value
      .map((row) => ({
        label: row.serviceDate,
        lineValue: Number(row.requiredHeadcountHours),
        barValue: Number(row.recommendedDailyFte)
      }))
      .filter(
        (point) =>
          typeof point.label === 'string' &&
          point.label.length > 0 &&
          Number.isFinite(point.lineValue) &&
          Number.isFinite(point.barValue)
      )
  }

  return calculatedRows.value
    .map((row) => {
      const source = parsedRows.value[row.rowIndex - 1] ?? {}
      return {
        label: formatIntervalLabel(row.intervalStart),
        lineValue: Number(source.calls_offered),
        barValue: Number(row.requiredStaffGross)
      }
    })
    .filter(
      (point) =>
        typeof point.label === 'string' &&
        point.label.length > 0 &&
        Number.isFinite(point.lineValue) &&
        Number.isFinite(point.barValue)
    )
})

const dailyDemandRows = computed(() => {
  if (selectedMode.value !== 'daily-plan') return []

  return calculatedRows.value.map((row) => {
    const source = parsedRows.value[row.rowIndex - 1] ?? {}
    return {
      rowIndex: row.rowIndex,
      queueId: row.queueId,
      intervalStart: row.intervalStart,
      callsOffered: Number(source.calls_offered),
      ahtSeconds: Number(source.aht_seconds),
      requiredAgents: row.requiredStaffNet,
      requiredHeadcount: row.requiredStaffGross,
      serviceLevel: row.serviceLevel,
      asaSeconds: row.asaSeconds,
      expectedOccupancy: row.expectedOccupancy
    }
  })
})

const fileProcessorTotalCalls = computed(() => {
  if (selectedMode.value !== 'file-processor' && selectedMode.value !== 'daily-plan') return 0
  return calculatedRows.value.reduce((total, row) => {
    const source = parsedRows.value[row.rowIndex - 1] ?? {}
    const calls = Number(source.calls_offered)
    return total + (Number.isFinite(calls) ? calls : 0)
  }, 0)
})

const activeChartPointIndex = ref(null)

const trendChart = computed(() => {
  const data = chartSeries.value
  if (!data.length) return null

  const width = 980
  const height = 420
  const padding = { top: 36, right: 70, bottom: 74, left: 70 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const maxLine = Math.max(...data.map((point) => point.lineValue))
  const maxBar = Math.max(...data.map((point) => point.barValue))
  const lineAxisMax = niceCeiling(maxLine)
  const barAxisMax = niceCeiling(maxBar)
  const pointCount = data.length
  const isDailyStacked = selectedMode.value === 'daily-plan'

  const barSlotWidth = pointCount > 1 ? plotWidth / pointCount : plotWidth * 0.5
  const barWidth = Math.max(1, Math.min(barSlotWidth * 0.72, 30))
  const xAt = (index) =>
    padding.left + (pointCount === 1 ? plotWidth / 2 : barSlotWidth * (index + 0.5))

  const yForLine = (value) => padding.top + plotHeight - (value / lineAxisMax) * plotHeight
  const yForBar = (value) => padding.top + plotHeight - (value / barAxisMax) * plotHeight
  const staffZeroY = yForBar(0)

  const hoverWidth = pointCount > 1 ? barSlotWidth : plotWidth * 0.5
  const points = data.map((point, index) => {
    const x = xAt(index)
    const lineY = yForLine(point.lineValue)
    const barY = yForBar(point.barValue)

    if (isDailyStacked) {
      const requiredAgentsY = yForBar(point.requiredAgents)
      const requiredHeadcountY = yForBar(point.barValue)
      return {
        ...point,
        index,
        x,
        lineY,
        barX: x - barWidth / 2,
        barWidth,
        hoverX: x - hoverWidth / 2,
        hoverWidth,
        requiredAgentsY,
        requiredHeadcountY,
        requiredAgentsHeight: Math.max(0, staffZeroY - requiredAgentsY),
        headcountAddonHeight: Math.max(0, requiredAgentsY - requiredHeadcountY)
      }
    }

    return {
      ...point,
      index,
      x,
      lineY,
      barY,
      barX: x - barWidth / 2,
      barWidth,
      hoverX: x - hoverWidth / 2,
      hoverWidth,
      barHeight: Math.max(0, padding.top + plotHeight - barY)
    }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.lineY}`)
    .join(' ')

  const yTickCount = 4
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) => {
    const ratio = index / yTickCount
    const y = padding.top + ratio * plotHeight
    return {
      y,
      lineValue: formatCount(lineAxisMax * (1 - ratio)),
      barValue: formatCount(barAxisMax * (1 - ratio))
    }
  })

  const targetTicks = 8
  const xTickStep = Math.max(1, Math.ceil(pointCount / targetTicks))
  const xTickIndexes = []
  for (let index = 0; index < pointCount; index += xTickStep) {
    xTickIndexes.push(index)
  }
  if (xTickIndexes[xTickIndexes.length - 1] !== pointCount - 1) {
    xTickIndexes.push(pointCount - 1)
  }

  const xTicks = xTickIndexes.map((index) => ({
    x: points[index].x,
    label: points[index].label
  }))

  return {
    width,
    height,
    padding,
    points,
    yTicks,
    linePath,
    xTicks
  }
})

const activeChartPoint = computed(() => {
  if (selectedMode.value !== 'daily-plan') return null
  if (!trendChart.value || activeChartPointIndex.value === null) return null
  return trendChart.value.points.find((point) => point.index === activeChartPointIndex.value) ?? null
})

const activeChartTooltip = computed(() => {
  if (selectedMode.value !== 'daily-plan') return null
  if (!trendChart.value || !activeChartPoint.value) return null

  const point = activeChartPoint.value
  const chart = trendChart.value
  const tooltipWidth = 250
  const tooltipHeight = 106

  let tooltipX = point.x + 12
  if (tooltipX + tooltipWidth > chart.width - 8) {
    tooltipX = point.x - tooltipWidth - 12
  }
  let tooltipY = point.lineY - tooltipHeight - 12
  if (tooltipY < chart.padding.top + 4) {
    tooltipY = point.lineY + 12
  }

  return {
    x: tooltipX,
    y: tooltipY,
    width: tooltipWidth,
    height: tooltipHeight,
    label: point.label,
    callsOffered: formatCount(point.lineValue),
    requiredAgents: formatCount(point.requiredAgents ?? 0),
    headcountAddon: formatCount(point.headcountAddon ?? 0),
    requiredHeadcount: formatCount(point.barValue)
  }
})

const primaryKpi = computed(() => {
  if (!summary.value) {
    return {
      label: 'Primary KPI',
      value: '--',
      meta: 'Run a workflow to calculate demand.'
    }
  }

  if (selectedMode.value === 'daily-plan') {
    return {
      label: 'Required Daily FTE',
      value: formatCount(summary.value.requiredDailyFte),
      meta: 'recommended staffing for the selected day'
    }
  }

  if (selectedMode.value === 'weekly-plan') {
    return {
      label: 'Average Daily FTE',
      value: formatDecimal(summary.value.averageDailyFte),
      meta: `across ${formatCount(summary.value.dayCount)} service days`
    }
  }

  return {
    label: 'Peak Headcount Need',
    value: formatCount(summary.value.peakStaffGross),
    meta: 'highest interval requirement in file'
  }
})

const hasTrendTab = computed(
  () => selectedMode.value !== 'file-processor' && trendChart.value !== null
)

const hasRowsTab = computed(() => {
  if (selectedMode.value === 'file-processor') return false
  if (selectedMode.value === 'daily-plan') return dailyDemandRows.value.length > 0
  if (selectedMode.value === 'weekly-plan') return results.value.length > 0 || dailyBreakdown.value.length > 0
  return false
})

const availableTabs = computed(() => {
  const tabs = [{ id: 'summary', label: 'Summary' }]
  if (hasTrendTab.value) tabs.push({ id: 'trend', label: 'Trend' })
  if (hasRowsTab.value) tabs.push({ id: 'rows', label: 'Rows' })
  if (errors.value.length > 0) tabs.push({ id: 'errors', label: `Errors (${errors.value.length})` })
  return tabs
})

watchEffect(() => {
  if (!hasSubmitted.value) {
    activeResultsTab.value = 'summary'
    return
  }

  if (!availableTabs.value.some((tab) => tab.id === activeResultsTab.value)) {
    activeResultsTab.value = availableTabs.value[0]?.id ?? 'summary'
  }
})

const jumpToOutputRow = async (rowIndex) => {
  if (!Number.isFinite(Number(rowIndex)) || Number(rowIndex) <= 0) return
  activeResultsTab.value = 'rows'
  focusedRowIndex.value = Number(rowIndex)
  await nextTick()
  const rowElement = document.getElementById(`batch-row-${rowIndex}`)
  rowElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const handlePrimaryExportShortcut = () => {
  if (primaryExportReady.value) {
    exportPrimary()
  }
}

onMounted(() => {
  window.addEventListener('wfm:export-primary', handlePrimaryExportShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('wfm:export-primary', handlePrimaryExportShortcut)
})
</script>

<template>
  <section id="csv-batch" class="calculator-section workspace-section" aria-labelledby="csv-batch-heading">
    <div class="container">
      <div class="calculator-card workspace-shell batch-workspace">
        <section id="batch-controls" class="workspace-pane workspace-controls">
          <div class="pane-heading">
            <p class="pane-kicker">Batch Planning</p>
            <h2 id="csv-batch-heading">Bulk Staffing Planner</h2>
            <p class="calculator-intro">
              Configure a workflow, upload demand intervals, and generate planning outputs at scale.
            </p>
          </div>

          <div class="planner-inputs">
            <h3>Workflow Mode</h3>
            <div class="mode-switcher" role="tablist" aria-label="Bulk planning workflow mode">
              <button
                v-for="workflow in WORKFLOWS"
                :key="workflow.id"
                type="button"
                class="mode-btn"
                :class="{ active: selectedMode === workflow.id }"
                role="tab"
                :aria-selected="selectedMode === workflow.id ? 'true' : 'false'"
                @click="setMode(workflow.id)"
              >
                {{ workflow.label }}
              </button>
            </div>
            <p class="helper-text">{{ currentWorkflow.summary }}</p>
          </div>

          <div class="planner-inputs">
            <h3>Source File</h3>
            <div class="batch-toolbar batch-toolbar-step">
              <label class="file-picker" for="batchCsvFile">Choose CSV</label>
              <input
                id="batchCsvFile"
                class="batch-file-input"
                type="file"
                accept=".csv,text/csv"
                @change="handleFileSelect"
              />
            </div>
            <p class="helper-text">
              <a class="inline-link" :href="currentWorkflow.templateHref" download>
                Download {{ currentWorkflow.label }} CSV template
              </a>
            </p>
            <p v-if="selectedFileName" class="helper-text">
              Loaded file: <strong>{{ selectedFileName }}</strong> ({{ parsedRowCount }} data rows)
            </p>
          </div>

          <div v-if="selectedMode === 'daily-plan'" class="planner-inputs">
            <h3>Daily Planner Inputs</h3>
            <div class="planner-grid planner-grid-single">
              <div class="field-group">
                <label for="intervalDurationMinutes">Interval Length (minutes)</label>
                <input
                  id="intervalDurationMinutes"
                  v-model.number="dayPlannerInputs.intervalDurationMinutes"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  required
                />
              </div>
            </div>

            <div class="planner-grid planner-grid-single">
              <div class="field-group">
                <label for="dailyAssumptionSource">Assumption Source</label>
                <select id="dailyAssumptionSource" v-model="dayPlannerInputs.assumptionSource">
                  <option value="file">Use values from file</option>
                  <option value="override">Use global overrides</option>
                </select>
              </div>
            </div>

            <p class="helper-text">
              <span v-if="useFileDailyAssumptions">
                Using service level and shrinkage assumptions from the uploaded file.
              </span>
              <span v-else>
                Configure global overrides below. Blank overrides must still be present in the file.
              </span>
            </p>

            <div v-if="!useFileDailyAssumptions" class="planner-grid planner-grid-assumptions">
              <div class="field-group">
                <label for="globalMeanPatience">Average Customer Patience</label>
                <input
                  id="globalMeanPatience"
                  v-model="dailyGlobalAssumptions.meanPatienceSeconds"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  placeholder="optional"
                />
              </div>
              <div class="field-group">
                <label for="globalServiceThreshold">Service Level Goal</label>
                <input
                  id="globalServiceThreshold"
                  v-model="dailyGlobalAssumptions.serviceLevelThreshold"
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputmode="decimal"
                  placeholder="optional"
                />
              </div>
              <div class="field-group">
                <label for="globalServiceTarget">Service Level Threshold</label>
                <input
                  id="globalServiceTarget"
                  v-model="dailyGlobalAssumptions.serviceLevelTargetSeconds"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  placeholder="optional"
                />
              </div>
              <div class="field-group">
                <label for="globalMaxOccupancy">Max Occupancy</label>
                <input
                  id="globalMaxOccupancy"
                  v-model="dailyGlobalAssumptions.maxOccupancy"
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputmode="decimal"
                  placeholder="optional"
                />
              </div>
              <div class="field-group">
                <label for="globalShrinkage">Shrinkage Assumption</label>
                <input
                  id="globalShrinkage"
                  v-model="dailyGlobalAssumptions.shrinkage"
                  type="number"
                  min="0"
                  max="99.9"
                  step="0.1"
                  inputmode="decimal"
                  placeholder="optional"
                />
              </div>
            </div>
          </div>

          <div v-if="selectedMode === 'weekly-plan'" class="planner-inputs">
            <h3>Weekly Planner Inputs</h3>
            <div class="planner-grid">
              <div class="field-group">
                <label for="weeklyShiftLength">Shift Length (hours)</label>
                <input
                  id="weeklyShiftLength"
                  v-model.number="weeklyPlannerInputs.shiftLengthHours"
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputmode="decimal"
                  required
                />
              </div>
              <div class="field-group">
                <label for="weeklyProductiveHours">Productive Hours / Day</label>
                <input
                  id="weeklyProductiveHours"
                  v-model.number="weeklyPlannerInputs.productiveHoursPerDay"
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputmode="decimal"
                  required
                />
              </div>
            </div>
            <p class="helper-text">
              Weekly plans require at least two distinct service dates in the uploaded file.
            </p>
          </div>

          <div class="planner-inputs">
            <h3>Run Workflow</h3>
            <button type="button" class="submit-btn" :disabled="isLoading" @click="runWorkflow">
              {{ isLoading ? 'Processing...' : currentWorkflow.runLabel }}
            </button>
          </div>

          <p v-if="parseError" class="status-message error">{{ parseError }}</p>
          <p v-if="submitError" class="status-message error">{{ submitError }}</p>
        </section>

        <section id="batch-results" class="workspace-pane workspace-output" aria-live="polite">
          <div class="workspace-output-header">
            <h3>Output Workspace</h3>
            <p>Sticky KPI summary, trend diagnostics, row-level tables, and CSV exports.</p>
          </div>

          <div v-if="!hasSubmitted && !isLoading && !parseError && !submitError" class="empty-state">
            Select a workflow, upload a CSV, then run processing to populate this workspace.
          </div>

          <section v-if="hasSubmitted" class="results-panel" aria-label="Batch calculation results">
            <div class="results-sticky-summary">
              <article class="answer-card answer-card-primary">
                <p class="metric-label">{{ primaryKpi.label }}</p>
                <p class="metric-value">{{ primaryKpi.value }}</p>
                <p class="metric-meta">{{ primaryKpi.meta }}</p>
              </article>
              <article class="answer-card">
                <p class="metric-label">Processed</p>
                <p class="metric-value">{{ formatCount(processedCount) }}</p>
                <p class="metric-meta">rows evaluated</p>
              </article>
              <article class="answer-card">
                <p class="metric-label">Succeeded</p>
                <p class="metric-value">{{ formatCount(successfulCount) }}</p>
                <p class="metric-meta">rows with valid calculations</p>
              </article>
              <article class="answer-card">
                <p class="metric-label">Failed</p>
                <p class="metric-value">{{ formatCount(failedCount) }}</p>
                <p class="metric-meta">rows requiring correction</p>
              </article>
            </div>

            <div class="results-tabs" role="tablist" aria-label="Batch result views">
              <button
                v-for="tab in availableTabs"
                :key="tab.id"
                type="button"
                class="result-tab-btn"
                :class="{ active: activeResultsTab === tab.id }"
                role="tab"
                :aria-selected="activeResultsTab === tab.id ? 'true' : 'false'"
                @click="activeResultsTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <div v-if="activeResultsTab === 'summary'" class="results-tab-panel">
              <div class="results-header">
                <h3>{{ currentWorkflow.label }} Results</h3>
                <p>
                  Processed rows are shown only when validations pass. Use the tabs for trend and row-level diagnostics.
                </p>
                <p
                  v-if="selectedMode === 'weekly-plan' && Array.isArray(summary?.planningNotes) && summary.planningNotes.length"
                  class="helper-text"
                >
                  {{ summary.planningNotes[0] }}
                </p>
              </div>

              <div v-if="selectedMode === 'file-processor' || selectedMode === 'daily-plan'" class="results-metrics">
                <article class="metric-card">
                  <p class="metric-label">Total Calls Offered</p>
                  <p class="metric-value">{{ formatVolume(fileProcessorTotalCalls) }}</p>
                  <p class="metric-meta">sum of interval demand</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Avg Service Level</p>
                  <p class="metric-value">{{ formatPercent(summary?.avgServiceLevel) }}</p>
                  <p class="metric-meta">across successful rows</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Avg ASA</p>
                  <p class="metric-value">{{ formatAsaSeconds(summary?.avgAsaSeconds) }}</p>
                  <p class="metric-meta">across successful rows</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Total Agent Hours</p>
                  <p class="metric-value">{{ formatDecimal(summary?.totalRequiredStaffHoursNet) }}</p>
                  <p class="metric-meta">required agents (no shrinkage)</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Total Headcount Hours</p>
                  <p class="metric-value">{{ formatDecimal(summary?.totalRequiredStaffHoursGross) }}</p>
                  <p class="metric-meta">required headcount with shrinkage</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Peak Agent Need</p>
                  <p class="metric-value">{{ formatCount(summary?.peakStaffNet) }}</p>
                  <p class="metric-meta">highest interval requirement</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Peak Headcount Need</p>
                  <p class="metric-value">{{ formatCount(summary?.peakStaffGross) }}</p>
                  <p class="metric-meta">highest gross requirement</p>
                </article>
              </div>

              <div v-else class="results-metrics">
                <article class="metric-card">
                  <p class="metric-label">Avg Service Level</p>
                  <p class="metric-value">{{ formatPercent(summary?.avgServiceLevel) }}</p>
                  <p class="metric-meta">across successful rows</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Avg ASA</p>
                  <p class="metric-value">{{ formatAsaSeconds(summary?.avgAsaSeconds) }}</p>
                  <p class="metric-meta">across successful rows</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Total Net Hours</p>
                  <p class="metric-value">{{ formatDecimal(summary?.totalRequiredStaffHoursNet) }}</p>
                  <p class="metric-meta">required labor net</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Total Gross Hours</p>
                  <p class="metric-value">{{ formatDecimal(summary?.totalRequiredStaffHoursGross) }}</p>
                  <p class="metric-meta">required labor gross</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Peak Net Staff</p>
                  <p class="metric-value">{{ formatCount(summary?.peakStaffNet) }}</p>
                  <p class="metric-meta">highest interval net staff</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Peak Gross Staff</p>
                  <p class="metric-value">{{ formatCount(summary?.peakStaffGross) }}</p>
                  <p class="metric-meta">highest interval gross staff</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Total Required HC Hours</p>
                  <p class="metric-value">{{ formatDecimal(summary?.totalRequiredHeadcountHours) }}</p>
                  <p class="metric-meta">week-level headcount demand</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Average Daily FTE</p>
                  <p class="metric-value">{{ formatDecimal(summary?.averageDailyFte) }}</p>
                  <p class="metric-meta">daily average for included days</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Peak Day</p>
                  <p class="metric-value">{{ summary?.peakDay ?? '-' }}</p>
                  <p class="metric-meta">{{ formatDecimal(summary?.peakDayRequiredHeadcountHours) }} HC hours</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Staffing Variability</p>
                  <p class="metric-value">{{ formatDecimal((summary?.staffingVariability ?? 0) * 100, 1) }}%</p>
                  <p class="metric-meta">range vs average daily FTE</p>
                </article>
              </div>

              <div class="batch-actions">
                <button
                  type="button"
                  class="secondary-btn"
                  :disabled="!primaryExportReady"
                  @click="exportPrimary"
                >
                  {{ currentWorkflow.exportLabel }}
                </button>
                <button
                  v-if="selectedMode === 'weekly-plan'"
                  type="button"
                  class="secondary-btn"
                  :disabled="!weeklyBreakdownExportReady"
                  @click="exportDailyBreakdown"
                >
                  Export Weekly Daily Breakdown
                </button>
              </div>
            </div>

            <div v-if="activeResultsTab === 'trend' && hasTrendTab" class="results-tab-panel">
              <div class="results-detail">
                <h4>{{ chartMeta.title }}</h4>
                <p class="helper-text">{{ chartMeta.description }}</p>

                <div class="trend-chart">
                  <svg
                    :viewBox="`0 0 ${trendChart.width} ${trendChart.height}`"
                    role="img"
                    aria-label="Mode-aware staffing trend chart"
                    @mouseleave="activeChartPointIndex = null"
                  >
                    <line
                      v-for="tick in trendChart.yTicks"
                      :key="`grid-${tick.y}`"
                      :x1="trendChart.padding.left"
                      :y1="tick.y"
                      :x2="trendChart.width - trendChart.padding.right"
                      :y2="tick.y"
                      class="trend-grid-line"
                    />

                    <line
                      :x1="trendChart.padding.left"
                      :y1="trendChart.padding.top"
                      :x2="trendChart.padding.left"
                      :y2="trendChart.height - trendChart.padding.bottom"
                      class="trend-axis"
                    />
                    <line
                      :x1="trendChart.width - trendChart.padding.right"
                      :y1="trendChart.padding.top"
                      :x2="trendChart.width - trendChart.padding.right"
                      :y2="trendChart.height - trendChart.padding.bottom"
                      class="trend-axis"
                    />
                    <line
                      :x1="trendChart.padding.left"
                      :y1="trendChart.height - trendChart.padding.bottom"
                      :x2="trendChart.width - trendChart.padding.right"
                      :y2="trendChart.height - trendChart.padding.bottom"
                      class="trend-axis"
                    />

                    <text
                      v-for="tick in trendChart.yTicks"
                      :key="`line-y-${tick.y}`"
                      :x="trendChart.padding.left - 10"
                      :y="tick.y + 4"
                      class="trend-ytick trend-ytick-calls"
                      text-anchor="end"
                    >
                      {{ tick.lineValue }}
                    </text>
                    <text
                      v-for="tick in trendChart.yTicks"
                      :key="`bar-y-${tick.y}`"
                      :x="trendChart.width - trendChart.padding.right + 10"
                      :y="tick.y + 4"
                      class="trend-ytick trend-ytick-staff"
                      text-anchor="start"
                    >
                      {{ tick.barValue }}
                    </text>

                    <rect
                      v-if="selectedMode === 'daily-plan'"
                      v-for="point in trendChart.points"
                      :key="`bar-base-${point.x}`"
                      :x="point.barX"
                      :y="point.requiredAgentsY"
                      :width="point.barWidth"
                      :height="point.requiredAgentsHeight"
                      :class="[
                        'trend-bar',
                        'trend-bar-staff-base',
                        { active: activeChartPointIndex === point.index }
                      ]"
                    >
                      <title>{{ point.label }} | Required Agents: {{ formatCount(point.requiredAgents) }}</title>
                    </rect>
                    <rect
                      v-if="selectedMode === 'daily-plan'"
                      v-for="point in trendChart.points"
                      :key="`bar-addon-${point.x}`"
                      :x="point.barX"
                      :y="point.requiredHeadcountY"
                      :width="point.barWidth"
                      :height="point.headcountAddonHeight"
                      :class="[
                        'trend-bar',
                        'trend-bar-staff-addon',
                        { active: activeChartPointIndex === point.index }
                      ]"
                    >
                      <title>
                        {{ point.label }} | Headcount Add-On: {{ formatCount(point.headcountAddon) }} | Required
                        Headcount: {{ formatCount(point.barValue) }}
                      </title>
                    </rect>
                    <rect
                      v-if="selectedMode !== 'daily-plan'"
                      v-for="point in trendChart.points"
                      :key="`bar-${point.x}`"
                      :x="point.barX"
                      :y="point.barY"
                      :width="point.barWidth"
                      :height="point.barHeight"
                      class="trend-bar trend-bar-staff-base"
                    >
                      <title>{{ point.label }} | {{ chartMeta.barLegend }}: {{ formatCount(point.barValue) }}</title>
                    </rect>

                    <rect
                      v-if="selectedMode === 'daily-plan'"
                      v-for="point in trendChart.points"
                      :key="`hover-zone-${point.x}`"
                      class="trend-hover-zone"
                      :x="point.hoverX"
                      :y="trendChart.padding.top"
                      :width="point.hoverWidth"
                      :height="trendChart.height - trendChart.padding.top - trendChart.padding.bottom"
                      tabindex="0"
                      role="button"
                      :aria-label="`Show interval details for ${point.label}`"
                      @mouseenter="activeChartPointIndex = point.index"
                      @focus="activeChartPointIndex = point.index"
                      @blur="activeChartPointIndex = null"
                    />

                    <line
                      v-if="selectedMode === 'daily-plan' && activeChartPoint"
                      :x1="activeChartPoint.x"
                      :x2="activeChartPoint.x"
                      :y1="trendChart.padding.top"
                      :y2="trendChart.height - trendChart.padding.bottom"
                      class="trend-focus-line"
                    />

                    <path :d="trendChart.linePath" class="trend-line trend-line-calls" />
                    <circle
                      v-for="point in trendChart.points"
                      :key="`line-point-${point.x}`"
                      :cx="point.x"
                      :cy="point.lineY"
                      :class="[
                        'trend-point',
                        'trend-point-calls',
                        { active: selectedMode === 'daily-plan' && activeChartPointIndex === point.index }
                      ]"
                      r="4"
                    >
                      <title>{{ point.label }} | {{ chartMeta.lineLegend }}: {{ formatCount(point.lineValue) }}</title>
                    </circle>

                    <g v-if="activeChartTooltip" style="pointer-events: none;">
                      <rect
                        class="trend-tooltip-box"
                        :x="activeChartTooltip.x"
                        :y="activeChartTooltip.y"
                        :width="activeChartTooltip.width"
                        :height="activeChartTooltip.height"
                        rx="8"
                        ry="8"
                      />
                      <text
                        class="trend-tooltip-title"
                        :x="activeChartTooltip.x + 10"
                        :y="activeChartTooltip.y + 18"
                      >
                        {{ activeChartTooltip.label }}
                      </text>
                      <text
                        class="trend-tooltip-text"
                        :x="activeChartTooltip.x + 10"
                        :y="activeChartTooltip.y + 40"
                      >
                        Calls Offered: {{ activeChartTooltip.callsOffered }}
                      </text>
                      <text
                        class="trend-tooltip-text"
                        :x="activeChartTooltip.x + 10"
                        :y="activeChartTooltip.y + 56"
                      >
                        Required Agents: {{ activeChartTooltip.requiredAgents }}
                      </text>
                      <text
                        class="trend-tooltip-text"
                        :x="activeChartTooltip.x + 10"
                        :y="activeChartTooltip.y + 72"
                      >
                        Headcount Add-On: {{ activeChartTooltip.headcountAddon }}
                      </text>
                      <text
                        class="trend-tooltip-text"
                        :x="activeChartTooltip.x + 10"
                        :y="activeChartTooltip.y + 88"
                      >
                        Required Headcount: {{ activeChartTooltip.requiredHeadcount }}
                      </text>
                    </g>

                    <text
                      v-for="tick in trendChart.xTicks"
                      :key="`tick-${tick.x}`"
                      :x="tick.x"
                      :y="trendChart.height - trendChart.padding.bottom + 14"
                      class="trend-tick-label"
                      text-anchor="end"
                      :transform="
                        `rotate(-22 ${tick.x} ${trendChart.height - trendChart.padding.bottom + 14})`
                      "
                    >
                      {{ tick.label }}
                    </text>

                    <text
                      :x="22"
                      :y="trendChart.height / 2"
                      class="trend-axis-label trend-axis-label-y"
                      text-anchor="middle"
                      :transform="`rotate(-90 22 ${trendChart.height / 2})`"
                    >
                      {{ chartMeta.leftAxis }}
                    </text>
                    <text
                      :x="trendChart.width - 18"
                      :y="trendChart.height / 2"
                      class="trend-axis-label trend-axis-label-y-right"
                      text-anchor="middle"
                      :transform="`rotate(90 ${trendChart.width - 18} ${trendChart.height / 2})`"
                    >
                      {{ chartMeta.rightAxis }}
                    </text>
                  </svg>
                </div>

                <div class="trend-legend" aria-label="Chart legend">
                  <span class="trend-legend-item">
                    <span class="trend-key trend-key-line-calls"></span>
                    <span class="trend-key-point trend-key-point-calls"></span>
                    {{ chartMeta.lineLegend }}
                  </span>
                  <span class="trend-legend-item" v-if="selectedMode === 'daily-plan'">
                    <span class="trend-key trend-key-staff-base"></span>
                    {{ chartMeta.barLegend }}
                  </span>
                  <span class="trend-legend-item" v-if="selectedMode === 'daily-plan'">
                    <span class="trend-key trend-key-staff-addon"></span>
                    {{ chartMeta.addonLegend }}
                  </span>
                  <span class="trend-legend-item" v-if="selectedMode !== 'daily-plan'">
                    <span class="trend-key trend-key-staff-base"></span>
                    {{ chartMeta.barLegend }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="activeResultsTab === 'rows' && hasRowsTab" class="results-tab-panel">
              <div v-if="selectedMode === 'daily-plan' && dailyDemandRows.length" class="results-detail">
                <h4>Interval Demand Table</h4>
                <div class="detail-grid" role="table" aria-label="Daily interval demand table">
                  <div class="detail-row detail-head detail-row-daily detail-row-daily-plan" role="row">
                    <span role="columnheader">Queue</span>
                    <span role="columnheader">Interval</span>
                    <span role="columnheader">Offered Calls</span>
                    <span role="columnheader">AHT</span>
                    <span role="columnheader">Required Agents</span>
                    <span role="columnheader">Required Headcount</span>
                    <span role="columnheader">Service Level</span>
                    <span role="columnheader">ASA</span>
                    <span role="columnheader">Expected Occupancy</span>
                  </div>
                  <div
                    v-for="row in dailyDemandRows"
                    :id="`batch-row-${row.rowIndex}`"
                    :key="`daily-row-${row.rowIndex}`"
                    :class="['detail-row', 'detail-row-daily', 'detail-row-daily-plan', { focused: focusedRowIndex === row.rowIndex }]"
                    role="row"
                  >
                    <span role="cell">{{ row.queueId }}</span>
                    <span role="cell">{{ row.intervalStart }}</span>
                    <span role="cell">{{ formatCount(row.callsOffered) }}</span>
                    <span role="cell">{{ formatDecimal(row.ahtSeconds, 1) }}</span>
                    <span role="cell">{{ formatCount(row.requiredAgents) }}</span>
                    <span role="cell">{{ formatCount(row.requiredHeadcount) }}</span>
                    <span role="cell">{{ formatPercent(row.serviceLevel) }}</span>
                    <span role="cell">{{ formatAsaSeconds(row.asaSeconds) }}</span>
                    <span role="cell">{{ formatPercent(row.expectedOccupancy) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="selectedMode === 'weekly-plan' && results.length" class="results-detail">
                <h4>Weekly Day Summary</h4>
                <div class="detail-grid" role="table" aria-label="Weekly day-level summary table">
                  <div class="detail-row detail-head detail-row-weekly" role="row">
                    <span role="columnheader">Service Date</span>
                    <span role="columnheader">Required Agent Hours</span>
                    <span role="columnheader">Required Headcount Hours</span>
                    <span role="columnheader">Peak Required Agents</span>
                    <span role="columnheader">Peak Required Headcount</span>
                    <span role="columnheader">Recommended Daily FTE</span>
                  </div>
                  <div
                    v-for="row in results"
                    :key="`weekly-row-${row.serviceDate}`"
                    class="detail-row detail-row-weekly"
                    role="row"
                  >
                    <span role="cell">{{ row.serviceDate }}</span>
                    <span role="cell">{{ formatDecimal(row.requiredAgentHours) }}</span>
                    <span role="cell">{{ formatDecimal(row.requiredHeadcountHours) }}</span>
                    <span role="cell">{{ formatCount(row.peakRequiredAgents) }}</span>
                    <span role="cell">{{ formatCount(row.peakRequiredHeadcount) }}</span>
                    <span role="cell">{{ formatCount(row.recommendedDailyFte) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="selectedMode === 'weekly-plan' && dailyBreakdown.length" class="results-detail">
                <h4>Weekly Interval Breakdown</h4>
                <div class="detail-grid" role="table" aria-label="Weekly interval breakdown table">
                  <div class="detail-row detail-head detail-row-daily" role="row">
                    <span role="columnheader">Queue</span>
                    <span role="columnheader">Interval</span>
                    <span role="columnheader">Offered Calls</span>
                    <span role="columnheader">AHT</span>
                    <span role="columnheader">Required Agents</span>
                    <span role="columnheader">Required Headcount</span>
                    <span role="columnheader">Service Level</span>
                    <span role="columnheader">ASA</span>
                    <span role="columnheader">Expected Occupancy</span>
                  </div>
                  <div
                    v-for="(row, index) in dailyBreakdown"
                    :id="`batch-row-${row.rowIndex}`"
                    :key="`breakdown-row-${index}`"
                    :class="['detail-row', 'detail-row-daily', { focused: focusedRowIndex === row.rowIndex }]"
                    role="row"
                  >
                    <span role="cell">{{ row.queueId }}</span>
                    <span role="cell">{{ row.intervalStart }}</span>
                    <span role="cell">{{ formatCount(row.callsOffered) }}</span>
                    <span role="cell">{{ formatDecimal(row.ahtSeconds, 1) }}</span>
                    <span role="cell">{{ formatCount(row.requiredAgents) }}</span>
                    <span role="cell">{{ formatCount(row.requiredHeadcount) }}</span>
                    <span role="cell">{{ formatPercent(row.serviceLevel) }}</span>
                    <span role="cell">{{ formatAsaSeconds(row.asaSeconds) }}</span>
                    <span role="cell">{{ formatPercent(row.expectedOccupancy) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeResultsTab === 'errors' && errors.length" class="results-tab-panel">
              <div class="results-detail">
                <h4>Row Errors</h4>
                <div class="detail-grid" role="table" aria-label="Batch validation errors table">
                  <div class="detail-row detail-head detail-row-errors detail-row-errors-actions" role="row">
                    <span role="columnheader">Row</span>
                    <span role="columnheader">Issue</span>
                    <span role="columnheader">Action</span>
                  </div>
                  <div
                    v-for="(error, index) in errors"
                    :key="`error-${error.rowIndex}-${index}`"
                    class="detail-row detail-row-errors detail-row-errors-actions"
                    role="row"
                  >
                    <span role="cell">{{ error.rowIndex }}</span>
                    <span role="cell">{{ error.message }}</span>
                    <span role="cell">
                      <button
                        v-if="error.rowIndex > 0 && hasRowsTab"
                        type="button"
                        class="row-jump-btn"
                        @click="jumpToOutputRow(error.rowIndex)"
                      >
                        Go To Row
                      </button>
                      <span v-else class="helper-text">No row target</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </div>
  </section>
</template>
