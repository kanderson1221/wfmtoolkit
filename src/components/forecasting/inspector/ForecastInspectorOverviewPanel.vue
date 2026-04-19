<script setup>
import AppStatStrip from '../../ui/AppStatStrip.vue'

defineProps({
  overviewItems: {
    type: Array,
    default: () => []
  },
  usingSharedPlanningHistory: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <section class="grid gap-4 rounded-[28px] border border-[#d5e0ea] bg-[radial-gradient(circle_at_top_left,rgba(21,57,95,0.12),transparent_46%),linear-gradient(180deg,#ffffff_0%,#f7fafc_100%)] p-4 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="grid gap-1">
        <span class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Setup Overview
        </span>
        <h3 class="text-lg font-semibold tracking-[-0.03em] text-slate-950">
          Training & assumptions
        </h3>
        <p class="text-sm leading-6 text-slate-600">
          {{
            usingSharedPlanningHistory
              ? 'Shared staffing-group history drives contacts and monthly AHT.'
              : 'Loaded history drives contacts and monthly AHT.'
          }}
        </p>
      </div>

      <span class="rounded-full border border-[#d5e0ea] bg-white/85 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#15395f] shadow-sm">
        {{ usingSharedPlanningHistory ? 'Shared history' : 'Loaded history' }}
      </span>
    </div>

    <AppStatStrip
      :items="overviewItems"
      columns="grid-cols-2"
      compact
    />
  </section>
</template>
