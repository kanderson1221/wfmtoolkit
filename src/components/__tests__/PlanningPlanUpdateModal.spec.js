import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PlanningPlanUpdateModal from '../planning/PlanningPlanUpdateModal.vue'

const AppDialogStub = {
  props: ['visible'],
  template: '<section v-if="visible"><slot /><slot name="footer" /></section>'
}

const AppButtonStub = {
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
}

const buildWrapper = (props = {}) => mount(PlanningPlanUpdateModal, {
  props: {
    visible: true,
    sourcePlan: {
      name: '2026 Budget',
      planningYear: 2026
    },
    budgetPlan: {
      name: '2026 Budget'
    },
    actualsThroughOptions: [
      {
        label: 'Actuals through Jan 2026',
        value: '2026-01-01'
      }
    ],
    actualsThroughMonth: '2026-01-01',
    updateName: '2026 Feb Update',
    ...props
  },
  global: {
    stubs: {
      AppButton: AppButtonStub,
      AppDialog: AppDialogStub,
      AppFieldGroup: {
        template: '<div><slot /></div>'
      },
      AppSelect: {
        props: ['modelValue', 'options', 'disabled'],
        template: '<select :disabled="disabled"><option>{{ modelValue }}</option></select>'
      },
      AppStatusMessage: {
        template: '<div role="status"><slot /></div>'
      },
      AppTextField: {
        props: ['modelValue'],
        template: '<input :value="modelValue" />'
      }
    }
  }
})

describe('PlanningPlanUpdateModal', () => {
  it('explains a later blocked cutoff and refuses a stale unavailable selection', async () => {
    const blocker =
      'Feb 2026 actuals have positive contacts but zero weighted AHT. ' +
      'Import corrected daily actuals with positive AHT before creating an updated plan through Feb or later.'
    const wrapper = buildWrapper({
      actualsThroughBlocker: blocker,
      actualsThroughMonth: '2026-02-01'
    })

    expect(wrapper.text()).toContain(blocker)

    const createButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Create Updated Plan')
    expect(createButton.attributes()).toHaveProperty('disabled')

    await createButton.trigger('click')
    expect(wrapper.emitted('create')).toBeUndefined()
  })
})
