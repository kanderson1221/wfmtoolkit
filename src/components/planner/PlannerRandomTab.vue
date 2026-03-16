<script setup>
import { computed } from 'vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'plan'
  },
  monthlyRecords: {
    type: Array,
    required: true
  },
  actualRecords: {
    type: Array,
    default: () => []
  },
  summary: {
    type: Object,
    required: true
  },
  formatPercent: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['copy-action', 'previous', 'continue', 'toggle-override-mode'])

const randomDefaults = defineModel('randomDefaults', {
  type: Object,
  default: null
})

const useMonthlyRandomOverrides = defineModel('useMonthlyRandomOverrides', {
  type: Boolean,
  default: false
})

const randomMonths = defineModel('randomMonths', {
  type: Array,
  default: null
})

const actualMonths = defineModel('actualMonths', {
  type: Array,
  default: null
})

const selectedMonthIndex = defineModel('selectedMonthIndex', {
  type: Number,
  required: true
})

const isActualMode = computed(() => props.mode === 'actuals')
const rows = computed(() => (isActualMode.value ? props.actualRecords : props.monthlyRecords))

const selectedMonth = computed(
  () => rows.value[selectedMonthIndex.value] ?? rows.value[0] ?? { label: 'month' }
)

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}

const handleCopyAction = (event) => {
  const action = event.target.value
  if (!action) return

  emit('copy-action', action)
  event.target.value = ''
}

const handleOverrideModeChange = (event) => {
  emit('toggle-override-mode', event.target.checked)
}
</script>

<template>
  <section class="results-panel monthly-tab-panel">
    <header class="monthly-tab-header">
      <div>
        <h3>{{ isActualMode ? 'Track actual adherence and occupancy month by month' : 'Set occupancy and adherence assumptions' }}</h3>
      </div>
      <p>
        {{
          isActualMode
            ? 'Track actual monthly adherence and occupancy against the actual scheduled % flowing in from the actual presence / utilization step.'
            : 'Use one global assumption set for the year, and only turn on monthly overrides if a few months need different values.'
        }}
      </p>
    </header>

    <div class="results-metrics monthly-summary-grid">
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Average Actual Occupancy' : props.summary.usesMonthlyOverrides ? 'Average Occupancy' : 'Occupancy' }}</p>
        <p class="metric-value">
          {{
            props.formatPercent(
              isActualMode
                ? props.summary.averageOccupancyPercent
                : props.summary.usesMonthlyOverrides
                  ? props.summary.averageOccupancyPercent
                  : props.summary.globalOccupancyPercent,
              1
            )
          }}
        </p>
        <p class="metric-meta">
          {{
            isActualMode
              ? 'Average actual occupancy result across the year'
              : props.summary.usesMonthlyOverrides
                ? 'Average monthly occupancy assumption'
                : 'Global occupancy assumption used across the full year'
          }}
        </p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Average Actual Adherence' : props.summary.usesMonthlyOverrides ? 'Average Adherence' : 'Adherence' }}</p>
        <p class="metric-value">
          {{
            props.formatPercent(
              isActualMode
                ? props.summary.averageAdherencePercent
                : props.summary.usesMonthlyOverrides
                  ? props.summary.averageAdherencePercent
                  : props.summary.globalAdherencePercent,
              1
            )
          }}
        </p>
        <p class="metric-meta">
          {{
            isActualMode
              ? 'Average actual adherence result across the year'
              : props.summary.usesMonthlyOverrides
                ? 'Average monthly adherence assumption'
                : 'Global adherence assumption used across the full year'
          }}
        </p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Avg Adherence Loss</p>
        <p class="metric-value">{{ props.formatPercent(props.summary.averageAdherenceLossPercent, 1) }}</p>
        <p class="metric-meta">{{ isActualMode ? 'Average actual loss applied to scheduled % from adherence' : 'Average monthly loss applied to scheduled % from adherence' }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Avg Occupancy Loss</p>
        <p class="metric-value">{{ props.formatPercent(props.summary.averageOccupancyLossPercent, 1) }}</p>
        <p class="metric-meta">{{ isActualMode ? 'Average actual loss applied after adherence loss is removed' : 'Average monthly loss applied after adherence loss is removed' }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Avg Total Scheduled Random Loss</p>
        <p class="metric-value">{{ props.formatPercent(props.summary.averageRandomLossPercent, 1) }}</p>
        <p class="metric-meta">Adherence loss plus occupancy loss against scheduled %</p>
      </article>
    </div>

    <section v-if="!isActualMode" class="input-group-card random-global-panel">
      <div class="workspace-output-header">
        <h3>Random Assumptions</h3>
        <p>These assumptions create adherence and occupancy losses against scheduled % and flow into the final design factor.</p>
      </div>

      <div class="monthly-global-grid random-global-grid">
        <div class="field-group">
          <label for="global-occupancy">{{ useMonthlyRandomOverrides ? 'Default Occupancy %' : 'Occupancy %' }}</label>
          <input
            id="global-occupancy"
            v-model.number="randomDefaults.occupancyPercent"
            type="number"
            min="1"
            max="100"
            step="0.1"
            aria-label="Global occupancy percent"
          />
          <p class="helper-text">
            {{
              useMonthlyRandomOverrides
                ? 'Seeds the monthly override table.'
                : 'Applies across the full plan year.'
            }}
          </p>
        </div>

        <div class="field-group">
          <label for="global-adherence">{{ useMonthlyRandomOverrides ? 'Default Adherence %' : 'Adherence %' }}</label>
          <input
            id="global-adherence"
            v-model.number="randomDefaults.adherencePercent"
            type="number"
            min="1"
            max="100"
            step="0.1"
            aria-label="Global adherence percent"
          />
          <p class="helper-text">
            {{
              useMonthlyRandomOverrides
                ? 'Seeds the monthly override table.'
                : 'Applies across the full plan year.'
            }}
          </p>
        </div>

        <div class="field-group random-override-field">
          <label for="use-random-overrides">Monthly overrides</label>
          <label class="random-override-toggle">
            <input
              id="use-random-overrides"
              :checked="useMonthlyRandomOverrides"
              type="checkbox"
              @change="handleOverrideModeChange"
            />
            <span>Use monthly overrides</span>
          </label>
          <p class="helper-text">Off for one yearly assumption set. On for month-level edits.</p>
        </div>
      </div>
    </section>

    <section class="input-group-card random-overrides-panel">
      <div class="workspace-output-header">
        <h3>{{ isActualMode ? 'Monthly Actual Random Results' : 'Monthly Random Overrides' }}</h3>
        <p>
          {{
            isActualMode
              ? 'Enter actual monthly occupancy and adherence. Losses are calculated from the actual scheduled % from the actual presence / utilization step.'
              : 'Adjust only the months that need different occupancy or adherence assumptions. Losses are calculated from scheduled % from Step 1.'
          }}
        </p>
      </div>

      <div v-if="!isActualMode && useMonthlyRandomOverrides" class="monthly-copy-toolbar">
        <label class="monthly-copy-select" for="random-copy-action">
          <span class="monthly-copy-label">Copy {{ selectedMonth.label }}</span>
          <select
            id="random-copy-action"
            class="monthly-copy-select-input"
            @change="handleCopyAction"
          >
            <option value="">Choose action</option>
            <option value="all">To all months</option>
            <option value="forward">Forward</option>
            <option value="quarter">Through quarter</option>
          </select>
        </label>
      </div>

      <div v-if="!isActualMode && !useMonthlyRandomOverrides" class="answer-card random-global-note">
        <h4>Global mode is on</h4>
        <p>These occupancy and adherence assumptions apply to every month in the plan. Adherence and occupancy losses are calculated from each month’s scheduled % from Step 1.</p>
      </div>

      <div v-else-if="!isActualMode && useMonthlyRandomOverrides" class="assumption-table-shell">
        <table class="assumption-table assumption-table-random">
          <thead>
            <tr>
              <th title="Planning month. Click a month name to highlight that row.">Month</th>
              <th title="Scheduled percentage flowing in from Step 1.">Scheduled %</th>
              <th title="Expected monthly occupancy assumption used in the random loss build.">Occupancy %</th>
              <th title="Expected monthly adherence assumption used in the random loss build.">Adherence %</th>
              <th title="Adherence loss calculated as (1 - Adherence %) x Scheduled %.">Adherence Loss</th>
              <th title="Occupancy loss calculated as (1 - Occupancy %) x (Scheduled % - Adherence Loss).">Occupancy Loss</th>
              <th title="Total scheduled random loss calculated as Adherence Loss + Occupancy Loss.">Total Random Loss</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in rows"
              :key="record.label"
              :class="{ selected: selectedMonthIndex === record.monthIndex }"
            >
              <td class="month-cell">
                <button
                  type="button"
                  class="assumption-month-btn"
                  @click="setSelectedMonth(record.monthIndex)"
                >
                  {{ record.fullLabel }}
                </button>
              </td>
              <td>{{ props.formatPercent(record.scheduledPercent, 1) }}</td>
              <td>
                <input
                  v-model.number="randomMonths[record.monthIndex].occupancyPercent"
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  aria-label="Occupancy percent"
                />
              </td>
              <td>
                <input
                  v-model.number="randomMonths[record.monthIndex].adherencePercent"
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  aria-label="Adherence percent"
                />
              </td>
              <td>{{ props.formatPercent(record.adherenceLossPercent, 1) }}</td>
              <td>{{ props.formatPercent(record.occupancyLossPercent, 1) }}</td>
              <td>{{ props.formatPercent(record.randomLossPercent, 1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="assumption-table-shell">
        <table class="assumption-table assumption-table-random">
          <thead>
            <tr>
              <th title="Planning month. Click a month name to highlight that row.">Month</th>
              <th title="Actual scheduled percentage flowing in from the actual presence / utilization step.">Actual Scheduled %</th>
              <th title="Actual occupancy result for the month.">Actual Occupancy %</th>
              <th title="Actual adherence result for the month.">Actual Adherence %</th>
              <th title="Adherence loss calculated as (1 - Adherence %) x Actual Scheduled %.">Adherence Loss</th>
              <th title="Occupancy loss calculated as (1 - Occupancy %) x (Actual Scheduled % - Adherence Loss).">Occupancy Loss</th>
              <th title="Total scheduled random loss calculated as Adherence Loss + Occupancy Loss.">Total Random Loss</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in rows"
              :key="`actual-random-${record.label}`"
              :class="{ selected: selectedMonthIndex === record.monthIndex }"
            >
              <td class="month-cell">
                <button
                  type="button"
                  class="assumption-month-btn"
                  @click="setSelectedMonth(record.monthIndex)"
                >
                  {{ record.fullLabel }}
                </button>
              </td>
              <td>{{ props.formatPercent(record.actualScheduledPercent, 1) }}</td>
              <td>
                <input
                  v-model.number="actualMonths[record.monthIndex].actualOccupancyPercent"
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  aria-label="Actual occupancy percent"
                />
              </td>
              <td>
                <input
                  v-model.number="actualMonths[record.monthIndex].actualAdherencePercent"
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  aria-label="Actual adherence percent"
                />
              </td>
              <td>{{ props.formatPercent(record.actualAdherenceLossPercent, 1) }}</td>
              <td>{{ props.formatPercent(record.actualOccupancyLossPercent, 1) }}</td>
              <td>{{ props.formatPercent(record.actualRandomLossPercent, 1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isActualMode && selectedMonth.warnings?.length" class="monthly-warning-stack">
      <p v-for="warning in selectedMonth.warnings" :key="warning" class="status-message error">
        {{ warning }}
      </p>
    </div>

    <div class="monthly-tab-actions">
      <button type="button" class="secondary-btn" @click="emit('previous')">Back to Presence / Utilization</button>
      <button type="button" class="submit-btn" @click="emit('continue')">Continue to Headcount Requirement</button>
    </div>
  </section>
</template>
