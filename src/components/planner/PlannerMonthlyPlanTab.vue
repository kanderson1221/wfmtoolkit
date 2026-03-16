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
  planSummary: {
    type: Object,
    default: null
  },
  actualSummary: {
    type: Object,
    default: null
  },
  monthlyChartMax: {
    type: Number,
    required: true
  },
  formatWhole: {
    type: Function,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  },
  formatPercent: {
    type: Function,
    required: true
  },
  formatFactor: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['previous', 'save'])

const planMonths = defineModel('planMonths', {
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
const summary = computed(() => (isActualMode.value ? props.actualSummary : props.planSummary))

const selectedMonth = computed(
  () => rows.value[selectedMonthIndex.value] ?? rows.value[0] ?? { planWarnings: [], warnings: [], label: 'month' }
)

const setSelectedMonth = (monthIndex) => {
  selectedMonthIndex.value = monthIndex
}
</script>

<template>
  <section class="results-panel monthly-tab-panel">
    <header class="monthly-tab-header">
      <div>
        <h3>{{ isActualMode ? 'Track actual workload and staffing month by month' : 'Build the monthly headcount requirement from demand' }}</h3>
      </div>
      <p v-if="isActualMode">
        Enter actual contacts, actual AHT, and actual headcount. The planner derives actual workload, required staff hours, and required headcount from the actual design factor built in the first two steps.
      </p>
    </header>

    <div class="results-metrics monthly-summary-grid">
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Annual Actual Contacts' : 'Annual Contacts' }}</p>
        <p class="metric-value">{{ props.formatWhole(summary?.annualActualContacts ?? summary?.annualContacts) }}</p>
        <p class="metric-meta">{{ isActualMode ? 'Sum of all monthly actual demand entered in the tracker' : 'Sum of all monthly demand entered in the demand model' }}</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Annual Actual Workload Hours' : 'Annual Workload Hours' }}</p>
        <p class="metric-value">{{ props.formatWhole(summary?.annualActualWorkloadHours ?? summary?.annualWorkloadHours) }}</p>
        <p class="metric-meta">
          {{ (summary?.busiestMonth?.fullLabel || summary?.peakMonth?.fullLabel || 'The busiest month') + (isActualMode ? ' is the busiest actual workload month' : ' is the busiest workload month') }}
        </p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Actual Needed Staff Hrs' : 'Avg Required Staff Hours' }}</p>
        <p class="metric-value">
          {{
            props.formatNumber(
              isActualMode ? summary?.annualActualRequiredStaffHours : summary?.averageRequiredStaffHours,
              1
            )
          }}
        </p>
        <p class="metric-meta">
          {{ isActualMode ? 'Total actual staffing hours required after actual design factor is applied' : 'Average staffing hours required after design factor is applied' }}
        </p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Avg Actual Req HC' : 'Avg Required Headcount' }}</p>
        <p class="metric-value">
          {{
            props.formatNumber(
              isActualMode ? summary?.averageActualRequiredHeadcount : summary?.averageRequiredHeadcount,
              1
            )
          }}
        </p>
        <p class="metric-meta">
          {{ isActualMode ? 'Average required headcount based on actual workload and actual design factor' : 'Average monthly required headcount before rounding' }}
        </p>
      </article>
      <article class="metric-card">
        <p class="metric-label">{{ isActualMode ? 'Avg Actual HC' : 'Peak Required Headcount' }}</p>
        <p class="metric-value">
          {{
            props.formatNumber(
              isActualMode ? summary?.averageActualHeadcount : summary?.peakMonth?.requiredHeadcount,
              1
            )
          }}
        </p>
        <p class="metric-meta">
          {{ isActualMode ? 'Average actual headcount entered into the tracker' : summary?.peakMonth?.fullLabel }}
        </p>
      </article>
      <article v-if="isActualMode" class="metric-card">
        <p class="metric-label">Peak Actual Req HC</p>
        <p class="metric-value">{{ props.formatNumber(summary?.peakMonth?.actualRequiredHeadcount, 1) }}</p>
        <p class="metric-meta">{{ summary?.peakMonth?.fullLabel }}</p>
      </article>
    </div>

    <div class="assumption-table-shell">
      <table class="assumption-table assumption-table-plan">
        <thead>
          <tr>
            <th title="Planning month. Click a month name to highlight that row.">Month</th>
            <th :title="isActualMode ? 'Actual monthly contact demand used to create workload hours.' : 'Monthly contact demand used to create workload hours.'">
              {{ isActualMode ? 'Actual Contacts' : 'Contacts' }}
            </th>
            <th :title="isActualMode ? 'Actual average handle time in seconds.' : 'Average handle time in seconds used to create workload hours.'">
              {{ isActualMode ? 'Actual AHT' : 'AHT Sec' }}
            </th>
            <th title="Business days flowing in from the presence / utilization step after weekday pattern and day adjustments.">Business Days</th>
            <th :title="isActualMode ? 'Actual scheduled percentage flowing in from actual presence and utilization.' : 'Scheduled percentage flowing in from the presence / utilization step.'">
              {{ isActualMode ? 'Actual Scheduled %' : 'Scheduled %' }}
            </th>
            <th :title="isActualMode ? 'Actual total scheduled random loss flowing in from the actual random step.' : 'Total scheduled random loss flowing in from the random step.'">
              <span class="plan-head-label">Total Random<br />Loss %</span>
            </th>
            <th :title="isActualMode ? 'Actual design factor is calculated as Actual Scheduled % - Total Random Loss %.' : 'Design Factor is calculated as Scheduled % - Total Random Loss %.'">Design Factor</th>
            <th :title="isActualMode ? 'Actual Workload Staffing Ratio is calculated as 1 / Actual Design Factor.' : 'Workload Staffing Ratio is calculated as 1 / Design Factor.'">
              <span class="plan-head-label">Workload<br />Staffing Ratio</span>
            </th>
            <th :title="isActualMode ? 'Actual monthly workload hours calculated from actual contacts and actual AHT.' : 'Monthly workload hours calculated from contacts and AHT.'">Workload Hours</th>
            <th :title="isActualMode ? 'Actual required staff hours calculated as Workload Hours x Workload Staffing Ratio.' : 'Required staff hours calculated as Workload Hours x Workload Staffing Ratio.'">
              <span class="plan-head-label">Required Staff<br />Hours</span>
            </th>
            <th :title="isActualMode ? 'Actual required headcount calculated as Required Staff Hours / Monthly FTE Paid Hours.' : 'Required headcount calculated as Required Staff Hours / Monthly FTE Paid Hours from the presence / utilization step.'">
              <span class="plan-head-label">Required<br />Headcount</span>
            </th>
            <th v-if="isActualMode" title="Actual headcount entered for the month.">
              <span class="plan-head-label">Actual<br />Headcount</span>
            </th>
            <th v-if="isActualMode" title="Actual headcount variance against planned required headcount.">
              <span class="plan-head-label">Headcount<br />Variance</span>
            </th>
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
            <td>
              <input
                v-if="isActualMode"
                v-model.number="actualMonths[record.monthIndex].actualContacts"
                type="number"
                min="0"
                step="100"
                aria-label="Actual contacts"
              />
              <input
                v-else
                v-model.number="planMonths[record.monthIndex].contacts"
                type="number"
                min="0"
                step="100"
                aria-label="Contacts"
              />
            </td>
            <td>
              <input
                v-if="isActualMode"
                v-model.number="actualMonths[record.monthIndex].actualAhtSeconds"
                type="number"
                min="0"
                step="1"
                aria-label="Actual average handle time in seconds"
              />
              <input
                v-else
                v-model.number="planMonths[record.monthIndex].ahtSeconds"
                type="number"
                min="0"
                step="1"
                aria-label="Average handle time in seconds"
              />
            </td>
            <td>{{ props.formatWhole(isActualMode ? record.planned.openDays : record.openDays) }}</td>
            <td>{{ props.formatPercent(isActualMode ? record.actualScheduledPercent : record.scheduledPercent, 1) }}</td>
            <td>{{ props.formatPercent(isActualMode ? record.actualRandomLossPercent : record.randomLossPercent, 1) }}</td>
            <td>{{ props.formatPercent(isActualMode ? record.actualDesignFactorPercent : record.designFactorPercent, 1) }}</td>
            <td>{{ props.formatFactor(isActualMode ? record.actualWorkloadStaffingRatio : record.workloadStaffingRatio) }}</td>
            <td>{{ props.formatNumber(isActualMode ? record.actualWorkloadHours : record.workloadHours, 1) }}</td>
            <td>{{ props.formatNumber(isActualMode ? record.actualRequiredStaffHours : record.requiredStaffHours, 1) }}</td>
            <td>{{ props.formatNumber(isActualMode ? record.actualRequiredHeadcount : record.requiredHeadcount, 1) }}</td>
            <td v-if="isActualMode">
              <input
                v-model.number="actualMonths[record.monthIndex].actualHeadcount"
                type="number"
                min="0"
                step="1"
                aria-label="Actual headcount"
              />
            </td>
            <td v-if="isActualMode">{{ props.formatNumber(record.actualHeadcountVariance, 1) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="(isActualMode ? selectedMonth.warnings : selectedMonth.planWarnings)?.length" class="monthly-warning-stack">
      <p
        v-for="warning in (isActualMode ? selectedMonth.warnings : selectedMonth.planWarnings)"
        :key="warning"
        class="status-message error"
      >
        {{ warning }}
      </p>
    </div>

    <section class="monthly-chart-panel">
      <div class="workspace-output-header">
        <h3>{{ isActualMode ? 'Monthly Actual Required Staffing' : 'Monthly Required Staffing' }}</h3>
        <p>
          {{ isActualMode ? 'Actual required staff hours by month after the actual design factor is applied.' : 'Required staff hours by month after the design factor is applied.' }}
        </p>
      </div>
      <div class="monthly-bars">
        <button
          v-for="record in rows"
          :key="record.label"
          type="button"
          class="monthly-bar-column"
          :class="{ active: selectedMonthIndex === record.monthIndex }"
          @click="setSelectedMonth(record.monthIndex)"
        >
          <small class="monthly-bar-month">{{ record.label }}</small>
          <div class="monthly-bar-cap">
            <strong>{{ props.formatWhole(isActualMode ? record.actualRoundedHeadcount : record.roundedHeadcount) }}</strong>
            <span>HC</span>
          </div>
          <div class="monthly-bar-stack">
            <div class="monthly-bar-track">
              <div
                class="monthly-bar-segment monthly-bar-final"
                :style="{
                  height: `${Math.max((((isActualMode ? record.actualRequiredStaffHours : record.requiredStaffHours) || 0) / props.monthlyChartMax) * 100, ((isActualMode ? record.actualRequiredStaffHours : record.requiredStaffHours) || 0) > 0 ? 6 : 0)}%`
                }"
              ></div>
            </div>
          </div>
          <div class="monthly-bar-footer">
            <strong>{{ props.formatWhole(isActualMode ? record.actualRequiredStaffHours : record.requiredStaffHours) }}</strong>
            <span>hours</span>
          </div>
          <div class="monthly-bar-tooltip">
            <p class="monthly-bar-tooltip-title">{{ record.fullLabel }}</p>
            <div class="monthly-bar-tooltip-grid">
              <span>{{ isActualMode ? 'Actual Workload Hrs' : 'Workload Hours' }}</span>
              <strong>{{ props.formatNumber(isActualMode ? record.actualWorkloadHours : record.workloadHours, 1) }}</strong>
              <span>{{ isActualMode ? 'Actual Staff Hrs' : 'Required Staff Hrs' }}</span>
              <strong>{{ props.formatNumber(isActualMode ? record.actualRequiredStaffHours : record.requiredStaffHours, 1) }}</strong>
              <span>{{ isActualMode ? 'Actual Req HC' : 'Required HC' }}</span>
              <strong>{{ props.formatNumber(isActualMode ? record.actualRequiredHeadcount : record.requiredHeadcount, 1) }}</strong>
              <template v-if="isActualMode">
                <span>Actual HC</span>
                <strong>{{ props.formatNumber(record.actualHeadcount, 1) }}</strong>
              </template>
              <span>Total Random Loss</span>
              <strong>{{ props.formatPercent(isActualMode ? record.actualRandomLossPercent : record.randomLossPercent, 1) }}</strong>
              <span>Design Factor</span>
              <strong>{{ props.formatPercent(isActualMode ? record.actualDesignFactorPercent : record.designFactorPercent, 1) }}</strong>
            </div>
          </div>
        </button>
      </div>
    </section>

    <div class="monthly-tab-actions">
      <button type="button" class="secondary-btn" @click="emit('previous')">Back to Random</button>
      <button type="button" class="submit-btn" @click="emit('save')">Save Plan</button>
    </div>
  </section>
</template>
