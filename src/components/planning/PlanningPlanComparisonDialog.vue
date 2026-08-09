<script setup>
import { computed, ref, watch } from 'vue'
import { mdiDownload } from '@mdi/js'

import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppEmptyState from '../ui/AppEmptyState.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppTableShell from '../ui/AppTableShell.vue'
import { downloadCsv, sanitizeFileNamePart } from '../../csvExport'
import {
  buildPlanScenarioComparison,
  buildPlanScenarioComparisonCsv
} from '../../planner/planScenarioComparison'

const props = defineProps({
  center: {
    type: Object,
    required: true
  },
  groupName: {
    type: String,
    required: true
  },
  section: {
    type: Object,
    required: true
  }
})

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

const baselinePlanId = ref('')
const candidatePlanId = ref('')

const planOptions = computed(() => props.section.rows.map((plan) => ({
  label: `${plan.name || `${plan.planningYear} Plan`}${plan.isCurrent ? ' — Current' : ''}`,
  value: plan.id
})))

const resetSelection = () => {
  const rows = props.section.rows || []
  const budgetPlan = rows.find((plan) => plan.planType === 'budget') || rows[0]
  const candidatePlan = rows.find((plan) => plan.isCurrent && plan.id !== budgetPlan?.id) ||
    rows.find((plan) => plan.id !== budgetPlan?.id)

  baselinePlanId.value = budgetPlan?.id || ''
  candidatePlanId.value = candidatePlan?.id || ''
}

watch(
  () => [visible.value, props.section],
  ([isVisible]) => {
    if (isVisible) {
      resetSelection()
    }
  },
  { immediate: true }
)

const baselinePlan = computed(() =>
  props.section.rows.find((plan) => plan.id === baselinePlanId.value) || null
)
const candidatePlan = computed(() =>
  props.section.rows.find((plan) => plan.id === candidatePlanId.value) || null
)
const comparison = computed(() => buildPlanScenarioComparison({
  baselinePlan: baselinePlan.value,
  candidatePlan: candidatePlan.value,
  center: props.center
}))

const formatNumber = (value, digits = 1) => {
  if (value == null || value === '') {
    return '—'
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(numericValue)
}

const formatWhole = (value) => {
  if (value == null || value === '') {
    return '—'
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value))
}

const formatSigned = (value, digits = 1) => {
  if (value == null || !Number.isFinite(Number(value))) {
    return '—'
  }

  const numericValue = Number(value)
  return `${numericValue > 0 ? '+' : ''}${formatNumber(numericValue, digits)}`
}

const formatMetric = (row, value) => row.unit === 'contacts'
  ? formatWhole(value)
  : formatNumber(value, row.unit === 'hours' ? 0 : 1)

const formatMetricDelta = (row) => row.comparable
  ? row.unit === 'contacts'
    ? formatSigned(row.delta, 0)
    : formatSigned(row.delta, row.unit === 'hours' ? 0 : 1)
  : 'Not comparable'

const formatMonth = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-01$/)
  if (!match) {
    return value || '—'
  }

  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
    .format(new Date(Number(match[1]), Number(match[2]) - 1, 1))
}

const assumptionRows = computed(() => {
  if (!comparison.value) {
    return []
  }

  const baseline = comparison.value.baseline
  const candidate = comparison.value.candidate

  return [
    {
      label: 'Requirement method',
      baseline: baseline.requirementMethodLabel,
      candidate: candidate.requirementMethodLabel
    },
    {
      label: 'Demand source',
      baseline: baseline.demandSourceLabel,
      candidate: candidate.demandSourceLabel
    },
    {
      label: 'Actuals through',
      baseline: formatMonth(baseline.actualsThroughMonth),
      candidate: formatMonth(candidate.actualsThroughMonth)
    },
    {
      label: 'Decision reason',
      baseline: baseline.planType === 'update'
        ? baseline.decisionReason || 'Not recorded (legacy plan)'
        : 'Budget baseline',
      candidate: candidate.planType === 'update'
        ? candidate.decisionReason || 'Not recorded (legacy plan)'
        : 'Budget baseline'
    },
    {
      label: 'Starting roster headcount',
      baseline: formatNumber(baseline.assumptions.startingRosterHeadcount, 1),
      candidate: formatNumber(candidate.assumptions.startingRosterHeadcount, 1)
    },
    {
      label: 'Starting frontline headcount',
      baseline: formatNumber(baseline.assumptions.startingFrontlineHeadcount, 1),
      candidate: formatNumber(candidate.assumptions.startingFrontlineHeadcount, 1)
    }
  ].map((row) => ({ ...row, changed: row.baseline !== row.candidate }))
})

const hasMaterialDelta = (value, threshold) =>
  value != null && Number.isFinite(Number(value)) && Math.abs(Number(value)) >= threshold

const monthlyDriverDefinitions = [
  { key: 'contactsDelta', threshold: 1, label: 'Contacts', digits: 0, suffix: ' contacts' },
  { key: 'ahtSecondsDelta', threshold: 0.1, label: 'AHT', digits: 1, suffix: ' sec' },
  { key: 'openDaysDelta', threshold: 0.5, label: 'Open days', digits: 0, suffix: ' days' },
  { key: 'paidHoursPerMonthDelta', threshold: 0.01, label: 'FTE paid hours', digits: 1, suffix: ' hr/mo' },
  { key: 'paidHoursPerDayDelta', threshold: 0.01, label: 'Shift paid hours', digits: 2, suffix: ' hr/day' },
  { key: 'presencePercentDelta', threshold: 0.01, label: 'Presence', digits: 1, suffix: ' pts' },
  { key: 'occupancyPercentDelta', threshold: 0.01, label: 'Occupancy', digits: 1, suffix: ' pts' },
  { key: 'adherencePercentDelta', threshold: 0.01, label: 'Adherence', digits: 1, suffix: ' pts' },
  { key: 'peakDayUpliftPercentDelta', threshold: 0.01, label: 'Peak-day uplift', digits: 1, suffix: ' pts' }
]

const getMonthlyDriverChanges = (row) => monthlyDriverDefinitions
  .filter((driver) => hasMaterialDelta(row[driver.key], driver.threshold))
  .map((driver) => `${driver.label} ${formatSigned(row[driver.key], driver.digits)}${driver.suffix}`)

const monthlyExceptions = computed(() => (comparison.value?.monthlyRows || [])
  .map((row) => ({ ...row, driverChanges: getMonthlyDriverChanges(row) }))
  .filter((row) =>
    row.driverChanges.length > 0 ||
    hasMaterialDelta(row.requiredHeadcountDelta, 0.05) ||
    hasMaterialDelta(row.peakDayRequiredHeadcountDelta, 0.05) ||
    hasMaterialDelta(row.endingFrontlineHeadcountDelta, 0.05) ||
    hasMaterialDelta(row.openingGapToRequirementDelta, 0.05) ||
    hasMaterialDelta(row.endingGapToRequirementDelta, 0.05)
  ))

const downloadComparison = () => {
  if (!comparison.value) {
    return
  }

  downloadCsv(
    `${sanitizeFileNamePart(props.groupName)}-${props.section.planningYear}-plan-comparison.csv`,
    buildPlanScenarioComparisonCsv(comparison.value)
  )
}
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    title="Compare Annual Plans"
    :description="`Review saved ${props.section.planningYear} snapshots for ${props.groupName}. Candidate minus baseline is shown; this review does not change either plan.`"
    kicker="Scenario review"
    max-width="max-w-7xl"
    @close="visible = false"
  >
    <div class="grid gap-5">
      <div class="grid grid-cols-2 gap-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
        <label class="grid gap-1.5 text-sm font-semibold text-slate-800">
          Baseline plan
          <AppSelect v-model="baselinePlanId" :options="planOptions" aria-label="Baseline plan" autofocus />
        </label>
        <label class="grid gap-1.5 text-sm font-semibold text-slate-800">
          Candidate plan
          <AppSelect v-model="candidatePlanId" :options="planOptions" aria-label="Candidate plan" />
        </label>
      </div>

      <AppStatusMessage v-if="baselinePlanId === candidatePlanId" tone="warning">
        Choose two different saved plans to review a scenario change.
      </AppStatusMessage>

      <template v-else-if="comparison">
        <AppStatusMessage v-if="comparison.methodWarning" tone="warning">
          {{ comparison.methodWarning }}
        </AppStatusMessage>

        <section class="grid gap-2" aria-labelledby="comparison-outcomes-heading">
          <div class="flex items-end justify-between gap-4">
            <div>
              <h3 id="comparison-outcomes-heading" class="text-base font-semibold text-slate-950">Annual outcomes</h3>
              <p class="text-sm text-slate-600">Saved totals and candidate-minus-baseline deltas.</p>
            </div>
          </div>
          <AppTableShell>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[760px] border-collapse text-sm">
              <thead class="bg-slate-50 text-left text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th scope="col" class="px-4 py-2.5">Measure</th>
                  <th scope="col" class="px-4 py-2.5 text-right">{{ comparison.baseline.name }}</th>
                  <th scope="col" class="px-4 py-2.5 text-right">{{ comparison.candidate.name }}</th>
                  <th scope="col" class="px-4 py-2.5 text-right">Change</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr v-for="row in comparison.metricRows" :key="row.label">
                  <th scope="row" class="px-4 py-2.5 text-left font-medium text-slate-800">{{ row.label }}</th>
                  <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ formatMetric(row, row.baselineValue) }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ formatMetric(row, row.candidateValue) }}</td>
                  <td class="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-950">{{ formatMetricDelta(row) }}</td>
                </tr>
              </tbody>
              </table>
            </div>
          </AppTableShell>
        </section>

        <section class="grid gap-2" aria-labelledby="comparison-assumptions-heading">
          <div>
            <h3 id="comparison-assumptions-heading" class="text-base font-semibold text-slate-950">Assumptions and lineage</h3>
            <p class="text-sm text-slate-600">Plan-level lineage and opening positions are shown here; monthly assumption changes are named in the exception review below.</p>
          </div>
          <AppTableShell>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[760px] border-collapse text-sm">
              <thead class="bg-slate-50 text-left text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th scope="col" class="px-4 py-2.5">Assumption</th>
                  <th scope="col" class="px-4 py-2.5">{{ comparison.baseline.name }}</th>
                  <th scope="col" class="px-4 py-2.5">{{ comparison.candidate.name }}</th>
                  <th scope="col" class="px-4 py-2.5">State</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr v-for="row in assumptionRows" :key="row.label" :class="row.changed ? 'bg-amber-50/60' : ''">
                  <th scope="row" class="px-4 py-2.5 text-left font-medium text-slate-800">{{ row.label }}</th>
                  <td class="px-4 py-2.5 text-slate-700">{{ row.baseline }}</td>
                  <td class="px-4 py-2.5 text-slate-700">{{ row.candidate }}</td>
                  <td class="px-4 py-2.5 font-semibold" :class="row.changed ? 'text-amber-800' : 'text-slate-500'">
                    {{ row.changed ? 'Changed' : 'No change' }}
                  </td>
                </tr>
              </tbody>
              </table>
            </div>
          </AppTableShell>
        </section>

        <section class="grid gap-2" aria-labelledby="comparison-monthly-heading">
          <div>
            <h3 id="comparison-monthly-heading" class="text-base font-semibold text-slate-950">Monthly exceptions</h3>
            <p class="text-sm text-slate-600">Candidate-minus-baseline changes are shown in contacts, seconds, days, FTE hours per month, shift hours, percentage points, and headcount.</p>
          </div>
          <AppTableShell v-if="monthlyExceptions.length">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[1260px] border-collapse text-sm">
              <thead class="bg-slate-50 text-left text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th scope="col" class="px-4 py-2.5">Month</th>
                  <th scope="col" class="min-w-[320px] px-4 py-2.5">Changed demand and capacity drivers</th>
                  <th scope="col" class="px-4 py-2.5 text-right">Average required HC change</th>
                  <th scope="col" class="px-4 py-2.5 text-right">Peak-day required HC change</th>
                  <th scope="col" class="px-4 py-2.5 text-right">Ending frontline change</th>
                  <th scope="col" class="px-4 py-2.5 text-right">Opening gap change</th>
                  <th scope="col" class="px-4 py-2.5 text-right">Ending gap change</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr v-for="row in monthlyExceptions" :key="row.monthIndex">
                  <th scope="row" class="px-4 py-2.5 text-left font-medium text-slate-800">{{ row.monthLabel }}</th>
                  <td class="px-4 py-2.5 text-slate-700">
                    {{ row.driverChanges.length ? row.driverChanges.join(' · ') : 'No demand or capacity driver change' }}
                  </td>
                  <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ comparison.requirementMethodComparable ? formatSigned(row.requiredHeadcountDelta, 1) : 'Not comparable' }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ comparison.requirementMethodComparable ? formatSigned(row.peakDayRequiredHeadcountDelta, 1) : 'Not comparable' }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ comparison.requirementMethodComparable ? formatSigned(row.endingFrontlineHeadcountDelta, 1) : 'Not comparable' }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ comparison.requirementMethodComparable ? formatSigned(row.openingGapToRequirementDelta, 1) : 'Not comparable' }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ comparison.requirementMethodComparable ? formatSigned(row.endingGapToRequirementDelta, 1) : 'Not comparable' }}</td>
                </tr>
              </tbody>
              </table>
            </div>
          </AppTableShell>
          <AppEmptyState
            v-else
            title="No material monthly changes"
            description="These saved plans have no monthly delta above the comparison thresholds."
          />
        </section>
      </template>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <AppButton
          variant="secondary"
          :icon="mdiDownload"
          :disabled="!comparison || baselinePlanId === candidatePlanId"
          @click="downloadComparison"
        >
          Download Comparison CSV
        </AppButton>
        <AppButton variant="primary" @click="visible = false">Close</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
