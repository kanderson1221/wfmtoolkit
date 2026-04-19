<script setup>
import ForecastComponentChart from '../ForecastComponentChart.vue'
import ForecastDailyChart from '../ForecastDailyChart.vue'
import AppEmptyState from '../../ui/AppEmptyState.vue'
import AppOptionPills from '../../ui/AppOptionPills.vue'

defineProps({
  contactSubviewTabs: {
    type: Array,
    default: () => []
  },
  dailyAccuracyHighlights: {
    type: Array,
    default: () => []
  },
  chartDailyRows: {
    type: Array,
    default: () => []
  },
  holdoutDays: {
    type: Number,
    default: 0
  },
  componentSections: {
    type: Array,
    default: () => []
  },
  embeddedInsightCards: {
    type: Array,
    default: () => []
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const activeContactsSubview = defineModel('activeContactsSubview', {
  type: String,
  default: 'forecast'
})
</script>

<template>
  <section class="grid gap-4">
    <div class="bg-white px-4 pb-1">
      <div class="grid gap-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="grid gap-3">
            <div class="grid gap-1">
              <h3 class="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                Forecasted demand vs historical volume
              </h3>
            </div>

            <AppOptionPills
              v-model="activeContactsSubview"
              aria-label="Contacts subviews"
              :items="contactSubviewTabs"
            />
          </div>

          <div
            v-if="activeContactsSubview === 'forecast' && dailyAccuracyHighlights.length"
            class="flex flex-wrap gap-2 lg:justify-end"
          >
            <span
              v-for="item in dailyAccuracyHighlights"
              :key="item.label"
              class="inline-flex items-baseline gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
            >
              <span class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {{ item.label }}
              </span>
              <strong class="font-semibold text-slate-950">{{ item.value }}</strong>
            </span>
          </div>
        </div>

        <div v-if="activeContactsSubview === 'forecast'" class="grid gap-4">
          <div class="overflow-hidden bg-white">
            <ForecastDailyChart
              :rows="chartDailyRows"
              :holdout-days="holdoutDays"
              :format-number="formatNumber"
              height-class="h-[31.25rem]"
              min-width-class="min-w-[760px]"
              :show-legend="false"
            />
          </div>

          <div class="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span class="inline-flex items-center gap-2">
              <span class="h-1.5 w-5 rounded-full bg-[#15395f]"></span>
              Historical volume
            </span>
            <span class="inline-flex items-center gap-2">
              <span class="h-1.5 w-5 rounded-full bg-[#0e7490]"></span>
              Forecasted demand
            </span>
            <span class="inline-flex items-center gap-2">
              <span class="h-3 w-5 rounded-full bg-[rgba(149,188,214,0.32)]"></span>
              Confidence band
            </span>
            <span v-if="holdoutDays" class="inline-flex items-center gap-2">
              <span class="h-3 w-5 rounded-sm bg-amber-100 ring-1 ring-amber-200"></span>
              Test period
            </span>
          </div>
        </div>

        <AppEmptyState
          v-else-if="!componentSections.length"
          title="No component output returned"
          description="This forecast run did not return separate component series."
        />

        <div v-else class="grid gap-4 2xl:grid-cols-2">
          <article
            v-for="section in componentSections"
            :key="section.id"
            class="grid gap-3 border border-slate-200 bg-white p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-base font-semibold tracking-[-0.02em] text-slate-950">
                {{ section.title }}
              </h3>
            </div>
            <ForecastComponentChart
              v-if="section.points.length"
              :title="section.title"
              :points="section.points"
              :format-number="formatNumber"
            />
            <p v-else class="text-sm leading-6 text-slate-600">
              This run did not return a monthly component series.
            </p>
          </article>
        </div>
      </div>
    </div>

    <div v-if="activeContactsSubview === 'forecast' && embeddedInsightCards.length" class="grid gap-3 lg:grid-cols-3">
      <article
        v-for="card in embeddedInsightCards"
        :key="card.title"
        class="grid gap-1 rounded-[20px] border border-slate-200 bg-white px-4 py-4"
      >
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {{ card.title }}
        </p>
        <p class="text-sm font-medium leading-6 text-slate-800">
          {{ card.body }}
        </p>
        <p v-if="card.meta" class="text-[0.82rem] text-slate-500">
          {{ card.meta }}
        </p>
      </article>
    </div>
  </section>
</template>
