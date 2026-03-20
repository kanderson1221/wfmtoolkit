<script setup>
import AppButton from '../ui/AppButton.vue'
import AppFieldGroup from '../ui/AppFieldGroup.vue'
import AppNumberField from '../ui/AppNumberField.vue'
import AppPanel from '../ui/AppPanel.vue'
import AppSectionHeader from '../ui/AppSectionHeader.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppStatusMessage from '../ui/AppStatusMessage.vue'
import AppWorkspaceSection from '../ui/AppWorkspaceSection.vue'

const props = defineProps({
  workflows: {
    type: Array,
    required: true
  },
  currentWorkflow: {
    type: Object,
    required: true
  },
  selectedMode: {
    type: String,
    required: true
  },
  selectedFileName: {
    type: String,
    default: ''
  },
  parsedRowCount: {
    type: Number,
    default: 0
  },
  parseError: {
    type: String,
    default: ''
  },
  submitError: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  useFileDailyAssumptions: {
    type: Boolean,
    default: false
  },
  dayPlannerInputs: {
    type: Object,
    required: true
  },
  weeklyPlannerInputs: {
    type: Object,
    required: true
  },
  dailyGlobalAssumptions: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['file-select', 'run-workflow', 'select-mode'])

const assumptionSourceOptions = [
  { label: 'Use values from file', value: 'file' },
  { label: 'Use global overrides', value: 'override' }
]
</script>

<template>
  <AppPanel :padded="false" class="grid content-start gap-5 p-5">
    <AppSectionHeader
      kicker="Batch Planning"
      title="Bulk Staffing Planner"
      description="Configure a workflow, upload demand intervals, and generate planning outputs at scale."
    />

    <AppWorkspaceSection
      title="Workflow Mode"
      description="Choose the staffing workflow you want to run against the uploaded demand file."
    >
      <div class="flex flex-wrap gap-2" role="tablist" aria-label="Bulk planning workflow mode">
        <AppButton
          v-for="workflow in props.workflows"
          :key="workflow.id"
          variant="tab"
          size="sm"
          :active="props.selectedMode === workflow.id"
          role="tab"
          :aria-selected="props.selectedMode === workflow.id ? 'true' : 'false'"
          @click="emit('select-mode', workflow.id)"
        >
          {{ workflow.label }}
        </AppButton>
      </div>

      <p class="text-sm leading-6 text-slate-600">
        {{ props.currentWorkflow.summary }}
      </p>
    </AppWorkspaceSection>

    <AppWorkspaceSection
      title="Source File"
      description="Upload the CSV input file for the selected workflow and use the matching template when needed."
    >
      <div class="flex flex-wrap items-center gap-3">
        <label
          for="batchCsvFile"
          class="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 md:w-auto"
        >
          Choose CSV
        </label>
        <input
          id="batchCsvFile"
          class="sr-only"
          type="file"
          accept=".csv,text/csv"
          @change="emit('file-select', $event)"
        />
        <a
          :href="props.currentWorkflow.templateHref"
          download
          class="inline-flex items-center gap-1 text-sm font-semibold text-blue-900 hover:text-blue-950"
        >
          Download {{ props.currentWorkflow.label }} CSV template
        </a>
      </div>

      <AppStatusMessage v-if="props.selectedFileName">
        Loaded file: <strong>{{ props.selectedFileName }}</strong> ({{ props.parsedRowCount }} data rows)
      </AppStatusMessage>
    </AppWorkspaceSection>

    <AppWorkspaceSection
      v-if="props.selectedMode === 'daily-plan'"
      title="Daily Planner Inputs"
      description="Set shift structure and tell the planner whether to read service assumptions from the file or use one shared override set."
    >
      <div class="grid gap-4 md:grid-cols-2">
        <AppFieldGroup label="Interval Length (minutes)" input-id="intervalDurationMinutes">
          <AppNumberField
            id="intervalDurationMinutes"
            v-model="props.dayPlannerInputs.intervalDurationMinutes"
            :min="1"
            :step="1"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Shift Paid Hours" input-id="dailyShiftPaidHours">
          <AppNumberField
            id="dailyShiftPaidHours"
            v-model="props.dayPlannerInputs.shiftPaidHours"
            :min="0.1"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Unpaid Lunch (minutes)" input-id="dailyUnpaidLunch">
          <AppNumberField
            id="dailyUnpaidLunch"
            v-model="props.dayPlannerInputs.unpaidLunchMinutes"
            :min="0"
            :step="1"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Lunch Earliest Start (hours into shift)" input-id="lunchWindowStartHours">
          <AppNumberField
            id="lunchWindowStartHours"
            v-model="props.dayPlannerInputs.lunchWindowStartHours"
            :min="0"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Lunch Latest Start (hours into shift)" input-id="lunchWindowEndHours">
          <AppNumberField
            id="lunchWindowEndHours"
            v-model="props.dayPlannerInputs.lunchWindowEndHours"
            :min="0"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Assumption Source" input-id="dailyAssumptionSource">
          <AppSelect
            id="dailyAssumptionSource"
            v-model="props.dayPlannerInputs.assumptionSource"
            :options="assumptionSourceOptions"
          />
        </AppFieldGroup>
      </div>

      <div class="grid gap-2 text-sm leading-6 text-slate-600">
        <p>Total shift length = Shift Paid Hours + Unpaid Lunch.</p>
        <p>Lunch start is constrained between Earliest and Latest Start (hours into shift).</p>
        <p v-if="props.useFileDailyAssumptions">
          Using service level and shrinkage assumptions from the uploaded file.
        </p>
        <p v-else>
          Configure global overrides below. Blank overrides must still be present in the file.
        </p>
      </div>

      <div
        v-if="!props.useFileDailyAssumptions"
        class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <AppFieldGroup label="Average Customer Patience" input-id="globalMeanPatience">
          <AppNumberField
            id="globalMeanPatience"
            v-model="props.dailyGlobalAssumptions.meanPatienceSeconds"
            :min="1"
            :step="1"
            placeholder="Optional"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Service Level Goal" input-id="globalServiceThreshold">
          <AppNumberField
            id="globalServiceThreshold"
            v-model="props.dailyGlobalAssumptions.serviceLevelThreshold"
            :min="0.1"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            placeholder="Optional"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Service Level Threshold" input-id="globalServiceTarget">
          <AppNumberField
            id="globalServiceTarget"
            v-model="props.dailyGlobalAssumptions.serviceLevelTargetSeconds"
            :min="0"
            :step="1"
            placeholder="Optional"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Max Occupancy" input-id="globalMaxOccupancy">
          <AppNumberField
            id="globalMaxOccupancy"
            v-model="props.dailyGlobalAssumptions.maxOccupancy"
            :min="0.1"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            placeholder="Optional"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Shrinkage Assumption" input-id="globalShrinkage">
          <AppNumberField
            id="globalShrinkage"
            v-model="props.dailyGlobalAssumptions.shrinkage"
            :min="0"
            :max="99.9"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
            placeholder="Optional"
          />
        </AppFieldGroup>
      </div>
    </AppWorkspaceSection>

    <AppWorkspaceSection
      v-if="props.selectedMode === 'weekly-plan'"
      title="Weekly Planner Inputs"
      description="Set the daily staffing assumptions used to convert interval demand into a weekly staffing view."
    >
      <div class="grid gap-4 md:grid-cols-2">
        <AppFieldGroup label="Shift Length (hours)" input-id="weeklyShiftLength">
          <AppNumberField
            id="weeklyShiftLength"
            v-model="props.weeklyPlannerInputs.shiftLengthHours"
            :min="0.1"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
          />
        </AppFieldGroup>

        <AppFieldGroup label="Productive Hours / Day" input-id="weeklyProductiveHours">
          <AppNumberField
            id="weeklyProductiveHours"
            v-model="props.weeklyPlannerInputs.productiveHoursPerDay"
            :min="0.1"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="1"
          />
        </AppFieldGroup>
      </div>

      <p class="text-sm leading-6 text-slate-600">
        Weekly plans require at least two distinct service dates in the uploaded file.
      </p>
    </AppWorkspaceSection>

    <AppWorkspaceSection
      title="Run Workflow"
      description="Process the uploaded CSV and generate the output workspace for the selected mode."
    >
      <AppButton
        variant="primary"
        block
        :disabled="props.isLoading"
        data-test="run-batch-workflow"
        @click="emit('run-workflow')"
      >
        {{ props.isLoading ? 'Processing...' : props.currentWorkflow.runLabel }}
      </AppButton>
    </AppWorkspaceSection>

    <AppStatusMessage v-if="props.parseError" tone="error">
      {{ props.parseError }}
    </AppStatusMessage>

    <AppStatusMessage v-if="props.submitError" tone="error">
      {{ props.submitError }}
    </AppStatusMessage>
  </AppPanel>
</template>
