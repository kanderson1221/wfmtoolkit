<script setup>
import { computed, ref } from 'vue'

const REQUIRED_HEADERS = [
  'queue_id',
  'interval_start',
  'calls_offered',
  'aht_seconds',
  'mean_patience_seconds',
  'service_level_threshold',
  'service_level_target_seconds',
  'max_occupancy'
]

const selectedFileName = ref('')
const parsedHeaders = ref([])
const parsedRows = ref([])
const parseError = ref('')
const submitError = ref('')
const isLoading = ref(false)
const hasSubmitted = ref(false)
const results = ref([])
const errors = ref([])
const summary = ref(null)

const parsedRowCount = computed(() => parsedRows.value.length)

const processedCount = computed(() => summary.value?.processedRows ?? 0)
const successfulCount = computed(() => summary.value?.successfulRows ?? 0)
const failedCount = computed(() => summary.value?.failedRows ?? errors.value.length)

const formatPercent = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unstable'
  return `${(value * 100).toFixed(1)}%`
}

const formatAsa = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unstable'
  if (value < 60) return `${value.toFixed(1)} sec`
  if (value < 120) return '> 1 min'
  if (value < 300) return '> 2 min'
  if (value < 600) return '> 5 min'
  if (value < 1200) return '> 10 min'
  if (value < 1800) return '> 20 min'
  if (value < 3600) return '> 30 min'
  return '> 60 min'
}

const formatHours = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0.00'
  return value.toFixed(2)
}

const integerFormatter = new Intl.NumberFormat()

const formatCount = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0'
  return integerFormatter.format(Math.round(value))
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

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
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
  const missingHeaders = REQUIRED_HEADERS.filter((required) => !headers.includes(required))
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

const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleFileSelect = async (event) => {
  const input = event.target
  const file = input.files?.[0]
  clearActivePoint()
  parseError.value = ''
  submitError.value = ''
  hasSubmitted.value = false
  results.value = []
  errors.value = []
  summary.value = null

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

const runBatchCalculation = async () => {
  clearActivePoint()
  parseError.value = ''
  submitError.value = ''
  hasSubmitted.value = false

  if (!parsedRows.value.length) {
    parseError.value = 'Upload a valid CSV file before running batch calculation.'
    return
  }

  isLoading.value = true
  try {
    const response = await fetch('/api/erlang-c/batch-calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rows: parsedRows.value })
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null)
      const detail = errorPayload?.detail
      const detailText = typeof detail === 'string' ? detail : 'Unable to process batch CSV.'
      throw new Error(detailText)
    }

    const payload = await response.json()
    results.value = payload.results ?? []
    errors.value = payload.errors ?? []
    summary.value = payload.summary ?? null
    hasSubmitted.value = true
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Unable to process batch CSV.'
  } finally {
    isLoading.value = false
  }
}

const activePointIndex = ref(null)

const clearActivePoint = () => {
  activePointIndex.value = null
}

const setActivePoint = (index) => {
  activePointIndex.value = index
}

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

const trendRows = computed(() =>
  results.value
    .map((row) => {
      const source = parsedRows.value[row.rowIndex - 1] ?? {}
      const callsOffered = Number(source.calls_offered)
      const requiredStaffNet = Number(row.requiredStaffNet)
      const requiredStaffGross = Number(row.requiredStaffGross)
      const additionalStaff = Math.max(0, requiredStaffGross - requiredStaffNet)
      return {
        intervalStart: row.intervalStart,
        callsOffered: Number.isFinite(callsOffered) ? callsOffered : 0,
        requiredStaffNet,
        requiredStaffGross,
        additionalStaff
      }
    })
    .filter(
      (row) =>
        Number.isFinite(row.callsOffered) &&
        Number.isFinite(row.requiredStaffNet) &&
        Number.isFinite(row.requiredStaffGross)
    )
)

const trendChart = computed(() => {
  const data = trendRows.value
  if (!data.length) return null

  const width = 980
  const height = 420
  const padding = { top: 36, right: 70, bottom: 74, left: 70 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const maxCalls = Math.max(...data.map((point) => point.callsOffered))
  const maxStaff = Math.max(...data.map((point) => point.requiredStaffGross))
  const callsAxisMax = niceCeiling(maxCalls)
  const staffAxisMax = niceCeiling(maxStaff)
  const pointCount = data.length

  const barSlotWidth = pointCount > 1 ? plotWidth / pointCount : plotWidth * 0.5
  const barWidth = Math.max(1, Math.min(barSlotWidth * 0.78, 26))
  const hoverWidth = pointCount > 1 ? barSlotWidth : plotWidth * 0.5

  const xAt = (index) =>
    padding.left + (pointCount === 1 ? plotWidth / 2 : barSlotWidth * (index + 0.5))
  const yForCalls = (value) => padding.top + plotHeight - (value / callsAxisMax) * plotHeight
  const yForStaff = (value) => padding.top + plotHeight - (value / staffAxisMax) * plotHeight
  const staffZeroY = yForStaff(0)

  const points = data.map((point, index) => {
    const x = xAt(index)
    const callsY = yForCalls(point.callsOffered)
    const staffNetY = yForStaff(point.requiredStaffNet)
    const staffGrossY = yForStaff(point.requiredStaffGross)

    return {
      ...point,
      index,
      intervalLabel: formatIntervalLabel(point.intervalStart),
      x,
      barX: x - barWidth / 2,
      barWidth,
      callsY,
      staffNetY,
      staffGrossY,
      staffBaseHeight: Math.max(0, staffZeroY - staffNetY),
      staffAddonHeight: Math.max(0, staffNetY - staffGrossY),
      hoverX: x - hoverWidth / 2,
      hoverWidth
    }
  })

  const callsPath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.callsY}`)
    .join(' ')

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
    label: points[index].intervalLabel
  }))

  const yTickCount = 4
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) => {
    const ratio = index / yTickCount
    const y = padding.top + ratio * plotHeight
    const callsValue = callsAxisMax * (1 - ratio)
    const staffValue = staffAxisMax * (1 - ratio)
    return {
      y,
      callsValue: formatCount(callsValue),
      staffValue: formatCount(staffValue)
    }
  })

  return {
    width,
    height,
    padding,
    points,
    yTicks,
    callsAxisMax,
    staffAxisMax,
    callsPath,
    xTicks
  }
})

const activePoint = computed(() => {
  if (!trendChart.value) return null
  if (activePointIndex.value === null) return null
  return trendChart.value.points.find((point) => point.index === activePointIndex.value) ?? null
})

const activeTooltip = computed(() => {
  if (!trendChart.value || !activePoint.value) return null

  const point = activePoint.value
  const chart = trendChart.value
  const tooltipWidth = 216
  const tooltipHeight = 104

  let tooltipX = point.x + 12
  if (tooltipX + tooltipWidth > chart.width - 8) {
    tooltipX = point.x - tooltipWidth - 12
  }
  let tooltipY = point.callsY - tooltipHeight - 12
  if (tooltipY < chart.padding.top + 4) {
    tooltipY = point.callsY + 12
  }

  return {
    x: tooltipX,
    y: tooltipY,
    width: tooltipWidth,
    height: tooltipHeight,
    intervalLabel: point.intervalLabel,
    callsOffered: formatCount(point.callsOffered),
    requiredStaffNet: formatCount(point.requiredStaffNet),
    additionalStaff: formatCount(point.additionalStaff),
    requiredStaffGross: formatCount(point.requiredStaffGross)
  }
})

const exportProcessedResults = () => {
  if (!results.value.length) return

  const calculatedHeaders = [
    'Agents',
    'Required Headcount',
    'Service Level',
    'ASA',
    'Answered Immediately',
    'Expected Occupancy',
    'Abandonment'
  ]

  const headers = [...parsedHeaders.value, ...calculatedHeaders]

  const rows = results.value.map((row) => {
    const source = parsedRows.value[row.rowIndex - 1] ?? {}
    return [
      ...parsedHeaders.value.map((header) => source[header] ?? ''),
      row.requiredStaffNet,
      row.requiredStaffGross,
      formatPercent(row.serviceLevel),
      formatAsa(row.asaSeconds),
      formatPercent(row.percentAnsweredImmediately),
      formatPercent(row.expectedOccupancy),
      formatPercent(row.abandonPercent)
    ]
  })

  const csv = [headers.join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))].join('\n')
  downloadCsv('erlang_batch_results.csv', `${csv}\n`)
}
</script>

<template>
  <section id="csv-batch" class="calculator-section" aria-labelledby="csv-batch-heading">
    <div class="container">
      <div class="calculator-card batch-card">
        <h2 id="csv-batch-heading">Bulk Staffing Planner</h2>
        <p class="calculator-intro">
          Upload interval-level CSV data, run Erlang calculations for every row, and review roll-up
          summary metrics in one run.
        </p>
        <p class="helper-text batch-tradeoff">
          CSV parsing is done client-side for fast feedback. Backend validation remains authoritative.
          If any row is invalid, no rows are processed.
        </p>
        <p class="helper-text">
          <a class="inline-link" href="/erlang_batch_template.csv" download>
            Download example CSV template (single-day data)
          </a>
        </p>

        <div class="batch-toolbar">
          <label class="file-picker" for="batchCsvFile">Choose CSV</label>
          <input
            id="batchCsvFile"
            class="batch-file-input"
            type="file"
            accept=".csv,text/csv"
            @change="handleFileSelect"
          />
          <button type="button" class="submit-btn" :disabled="isLoading" @click="runBatchCalculation">
            {{ isLoading ? 'Processing...' : 'Run Batch Calculation' }}
          </button>
        </div>

        <p v-if="selectedFileName" class="helper-text">
          Loaded file: <strong>{{ selectedFileName }}</strong> ({{ parsedRowCount }} data rows)
        </p>

        <p v-if="parseError" class="status-message error">{{ parseError }}</p>
        <p v-if="submitError" class="status-message error">{{ submitError }}</p>

        <section
          v-if="hasSubmitted"
          class="results-panel"
          aria-live="polite"
          aria-label="Batch calculation results"
        >
          <div class="results-header">
            <h3>Batch Summary</h3>
            <p>Batch runs only when every row is valid. Fix errors and upload again if validation fails.</p>
          </div>

          <div class="batch-counts" role="status" aria-label="Batch processing counts">
            <span>Processed: {{ processedCount }}</span>
            <span>Succeeded: {{ successfulCount }}</span>
            <span>Failed: {{ failedCount }}</span>
          </div>

          <div class="results-metrics">
            <article class="metric-card">
              <p class="metric-label">Avg Service Level</p>
              <p class="metric-value">{{ formatPercent(summary?.avgServiceLevel) }}</p>
              <p class="metric-meta">across successful rows</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Avg ASA</p>
              <p class="metric-value">{{ formatAsa(summary?.avgAsaSeconds) }}</p>
              <p class="metric-meta">across successful rows</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Total Net Hours</p>
              <p class="metric-value">{{ formatHours(summary?.totalRequiredStaffHoursNet) }}</p>
              <p class="metric-meta">required labor net</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Total Gross Hours</p>
              <p class="metric-value">{{ formatHours(summary?.totalRequiredStaffHoursGross) }}</p>
              <p class="metric-meta">required labor gross</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Peak Net Staff</p>
              <p class="metric-value">{{ summary?.peakStaffNet ?? 0 }}</p>
              <p class="metric-meta">highest interval requirement</p>
            </article>
            <article class="metric-card">
              <p class="metric-label">Peak Gross Staff</p>
              <p class="metric-value">{{ summary?.peakStaffGross ?? 0 }}</p>
              <p class="metric-meta">after shrinkage</p>
            </article>
          </div>

          <div class="batch-actions">
            <button type="button" class="secondary-btn" :disabled="!results.length" @click="exportProcessedResults">
              Export Processed Results CSV
            </button>
          </div>

          <div v-if="trendChart" class="results-detail">
            <h4>Interval Trend</h4>
            <p class="helper-text">
              Stacked bars show required staff split into net staff and shrinkage add-on (right axis).
              The line shows interval call volume (left axis).
            </p>

            <div class="trend-chart">
              <svg
                :viewBox="`0 0 ${trendChart.width} ${trendChart.height}`"
                role="img"
                aria-label="Interval trend chart for calls offered and required staff"
                @mouseleave="clearActivePoint"
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
                  :key="`calls-y-${tick.y}`"
                  :x="trendChart.padding.left - 10"
                  :y="tick.y + 4"
                  class="trend-ytick trend-ytick-calls"
                  text-anchor="end"
                >
                  {{ tick.callsValue }}
                </text>
                <text
                  v-for="tick in trendChart.yTicks"
                  :key="`staff-y-${tick.y}`"
                  :x="trendChart.width - trendChart.padding.right + 10"
                  :y="tick.y + 4"
                  class="trend-ytick trend-ytick-staff"
                  text-anchor="start"
                >
                  {{ tick.staffValue }}
                </text>

                <rect
                  v-for="point in trendChart.points"
                  :key="`bar-base-${point.index}`"
                  :x="point.barX"
                  :y="point.staffNetY"
                  :width="point.barWidth"
                  :height="point.staffBaseHeight"
                  :class="['trend-bar trend-bar-staff-base', { active: activePointIndex === point.index }]"
                />
                <rect
                  v-for="point in trendChart.points"
                  :key="`bar-addon-${point.index}`"
                  :x="point.barX"
                  :y="point.staffGrossY"
                  :width="point.barWidth"
                  :height="point.staffAddonHeight"
                  :class="['trend-bar trend-bar-staff-addon', { active: activePointIndex === point.index }]"
                />

                <path :d="trendChart.callsPath" class="trend-line trend-line-calls" />
                <circle
                  v-for="point in trendChart.points"
                  :key="`calls-point-${point.index}`"
                  :cx="point.x"
                  :cy="point.callsY"
                  :class="['trend-point trend-point-calls', { active: activePointIndex === point.index }]"
                  r="4"
                />

                <line
                  v-if="activePoint"
                  :x1="activePoint.x"
                  :y1="trendChart.padding.top"
                  :x2="activePoint.x"
                  :y2="trendChart.height - trendChart.padding.bottom"
                  class="trend-focus-line"
                />

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

                <rect
                  v-for="point in trendChart.points"
                  :key="`hover-${point.index}`"
                  :x="point.hoverX"
                  :y="trendChart.padding.top"
                  :width="point.hoverWidth"
                  :height="trendChart.height - trendChart.padding.bottom - trendChart.padding.top"
                  class="trend-hover-zone"
                  tabindex="0"
                  @mouseenter="setActivePoint(point.index)"
                  @focus="setActivePoint(point.index)"
                >
                  <title>
                    {{ point.intervalLabel }} | Calls Offered: {{ formatCount(point.callsOffered) }} | Required Staff
                    (Net): {{ formatCount(point.requiredStaffNet) }} | Shrinkage Add-On:
                    {{ formatCount(point.additionalStaff) }} | Required Headcount:
                    {{ formatCount(point.requiredStaffGross) }}
                  </title>
                </rect>

                <g v-if="activeTooltip" class="trend-tooltip-group">
                  <rect
                    :x="activeTooltip.x"
                    :y="activeTooltip.y"
                    :width="activeTooltip.width"
                    :height="activeTooltip.height"
                    class="trend-tooltip-box"
                    rx="10"
                    ry="10"
                  />
                  <text :x="activeTooltip.x + 10" :y="activeTooltip.y + 20" class="trend-tooltip-title">
                    {{ activeTooltip.intervalLabel }}
                  </text>
                  <text :x="activeTooltip.x + 10" :y="activeTooltip.y + 44" class="trend-tooltip-text">
                    Calls Offered: {{ activeTooltip.callsOffered }}
                  </text>
                  <text :x="activeTooltip.x + 10" :y="activeTooltip.y + 62" class="trend-tooltip-text">
                    Required Staff (Net): {{ activeTooltip.requiredStaffNet }}
                  </text>
                  <text :x="activeTooltip.x + 10" :y="activeTooltip.y + 80" class="trend-tooltip-text">
                    Shrinkage Add-On: {{ activeTooltip.additionalStaff }}
                  </text>
                  <text :x="activeTooltip.x + 10" :y="activeTooltip.y + 98" class="trend-tooltip-text">
                    Required Headcount: {{ activeTooltip.requiredStaffGross }}
                  </text>
                </g>
                <text
                  :x="22"
                  :y="trendChart.height / 2"
                  class="trend-axis-label trend-axis-label-y"
                  text-anchor="middle"
                  :transform="`rotate(-90 22 ${trendChart.height / 2})`"
                >
                  Calls Offered
                </text>
                <text
                  :x="trendChart.width - 18"
                  :y="trendChart.height / 2"
                  class="trend-axis-label trend-axis-label-y-right"
                  text-anchor="middle"
                  :transform="`rotate(90 ${trendChart.width - 18} ${trendChart.height / 2})`"
                >
                  Required Staff
                </text>
              </svg>
            </div>

            <div class="trend-legend" aria-label="Chart legend">
              <span class="trend-legend-item">
                <span class="trend-key trend-key-line-calls"></span>
                <span class="trend-key-point trend-key-point-calls"></span>
                Interval Call Volume
              </span>
              <span class="trend-legend-item">
                <span class="trend-key trend-key-staff-base"></span>
                Required Staff (Net)
              </span>
              <span class="trend-legend-item">
                <span class="trend-key trend-key-staff-addon"></span>
                Shrinkage Add-On to Gross
              </span>
            </div>
          </div>

          <div v-if="errors.length" class="results-detail">
            <h4>Row Errors</h4>
            <div class="detail-grid" role="table" aria-label="Batch validation errors table">
              <div class="detail-row detail-head detail-row-errors" role="row">
                <span role="columnheader">Row</span>
                <span role="columnheader">Error</span>
              </div>
              <div v-for="error in errors" :key="`error-${error.rowIndex}`" class="detail-row detail-row-errors" role="row">
                <span role="cell">{{ error.rowIndex }}</span>
                <span role="cell">{{ error.message }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
