import { mount } from '@vue/test-utils'

import PlanningGroupSettingsModal from '../planning/PlanningGroupSettingsModal.vue'

const AppDialogStub = {
  name: 'AppDialog',
  props: ['title'],
  emits: ['close', 'update:visible'],
  template: `
    <div>
      <h2>{{ title }}</h2>
      <slot />
      <slot name="footer" />
    </div>
  `
}

const AppFieldGroupStub = {
  name: 'AppFieldGroup',
  props: ['label', 'inputId', 'helpText'],
  template: `
    <label :for="inputId">
      <span>{{ label }}</span>
      <slot />
      <small v-if="helpText">{{ helpText }}</small>
    </label>
  `
}

const AppTextFieldStub = {
  name: 'AppTextField',
  props: ['modelValue', 'id'],
  emits: ['update:modelValue'],
  template: '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}

const AppNumberFieldStub = {
  name: 'AppNumberField',
  props: ['modelValue', 'inputId'],
  emits: ['update:modelValue'],
  template: '<input :id="inputId" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />'
}

const AppButtonStub = {
  name: 'AppButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>'
}

describe('PlanningGroupSettingsModal', () => {
  it('surfaces service-level fields in the staffing-group settings dialog', async () => {
    const wrapper = mount(PlanningGroupSettingsModal, {
      props: {
        groupName: 'SG1',
        defaultPaidHoursPerDay: 8,
        defaultOccupancyPercent: 90,
        defaultAdherencePercent: 88,
        serviceLevelPercent: 80,
        serviceLevelThresholdSeconds: 20,
        'onUpdate:groupName': (value) => wrapper.setProps({ groupName: value }),
        'onUpdate:defaultPaidHoursPerDay': (value) => wrapper.setProps({ defaultPaidHoursPerDay: value }),
        'onUpdate:defaultOccupancyPercent': (value) => wrapper.setProps({ defaultOccupancyPercent: value }),
        'onUpdate:defaultAdherencePercent': (value) => wrapper.setProps({ defaultAdherencePercent: value }),
        'onUpdate:serviceLevelPercent': (value) => wrapper.setProps({ serviceLevelPercent: value }),
        'onUpdate:serviceLevelThresholdSeconds': (value) => wrapper.setProps({ serviceLevelThresholdSeconds: value })
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub,
          AppFieldGroup: AppFieldGroupStub,
          AppTextField: AppTextFieldStub,
          AppNumberField: AppNumberFieldStub,
          AppButton: AppButtonStub
        }
      }
    })

    expect(wrapper.text()).toContain('Service Level')
    expect(wrapper.text()).toContain('Answer')
    expect(wrapper.text()).toContain('% of contacts within')
    expect(wrapper.text()).toContain('seconds')

    await wrapper.get('#group-service-level-percent').setValue('85')
    await wrapper.get('#group-service-level-seconds').setValue('30')
    await wrapper.get('button:last-of-type').trigger('click')

    expect(wrapper.props('serviceLevelPercent')).toBe(85)
    expect(wrapper.props('serviceLevelThresholdSeconds')).toBe(30)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})
