<script setup>
import { computed } from 'vue'
import AppButton from '../ui/AppButton.vue'
import AppDialog from '../ui/AppDialog.vue'
import AppSelect from '../ui/AppSelect.vue'
import AppTextField from '../ui/AppTextField.vue'

const props = defineProps({
  yearOptions: {
    type: Array,
    required: true
  },
  canClose: {
    type: Boolean,
    default: true
  },
  allowBackdropClose: {
    type: Boolean,
    default: true
  },
  statusMessage: {
    type: String,
    default: ''
  },
  statusTone: {
    type: String,
    default: 'success'
  }
})

const emit = defineEmits(['cancel', 'close', 'load-example', 'reset'])

const planName = defineModel('planName', {
  type: String,
  required: true
})

const planningYear = defineModel('planningYear', {
  type: Number,
  required: true
})

const dialogOpen = computed({
  get: () => true,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  }
})
</script>

<template>
  <AppDialog
    v-model:visible="dialogOpen"
    title="Staffing Group Settings"
    description="Name the staffing group, set its planning year, and choose whether to seed the editor with sample assumptions."
    kicker="Planning App"
    :allow-backdrop-close="props.allowBackdropClose"
    max-width="max-w-3xl"
    @close="emit('close')"
  >

    <div class="grid gap-4">
      <section class="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
        <div class="grid gap-1">
          <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Identity
          </span>
          <p class="text-sm text-slate-600">
            Give the staffing group a name and anchor the model to the year you want to plan.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-[1.25fr_0.8fr]">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-slate-700">Staffing Group Name</span>
            <AppTextField
              v-model.trim="planName"
              maxlength="80"
              placeholder="Consumer Voice"
              autofocus
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-slate-700">Planning Year</span>
            <AppSelect v-model="planningYear" :options="props.yearOptions" />
          </label>
        </div>
      </section>

      <div
        v-if="props.statusMessage"
        class="rounded-3xl border px-4 py-3 text-sm font-medium"
        :class="
          props.statusTone === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        "
      >
          {{ props.statusMessage }}
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col gap-4 border-t border-slate-200 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <AppButton variant="secondary" @click="emit('cancel')">Cancel</AppButton>
          <AppButton variant="secondary" @click="emit('load-example')">Load Example</AppButton>
          <AppButton variant="secondary" @click="emit('reset')">Reset</AppButton>
        </div>

        <AppButton variant="primary" :disabled="!props.canClose" @click="emit('close')">Done</AppButton>
      </div>
    </template>
  </AppDialog>
</template>
