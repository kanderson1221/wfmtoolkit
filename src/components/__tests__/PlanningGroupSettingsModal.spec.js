import { mount } from '@vue/test-utils'

import PlanningGroupSettingsModal from '../planning/PlanningGroupSettingsModal.vue'

const AppDialogStub = {
  name: 'AppDialog',
  props: ['title'],
  emits: ['close', 'update:visible'],
  template: '<div><h2>{{ title }}</h2><slot /><slot name="footer" /></div>'
}

const AppFieldGroupStub = {
  name: 'AppFieldGroup',
  props: ['label', 'inputId', 'helpText'],
  template: '<label :for="inputId"><span>{{ label }}</span><slot /><small v-if="helpText">{{ helpText }}</small></label>'
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

const mountModal = (overrides = {}) => {
  let wrapper
  const props = {
    groupName: 'SG1',
    channelType: 'voice',
    serviceGoalPercent: 80,
    serviceGoalThreshold: 20,
    defaultPaidHoursPerDay: 8,
    defaultOccupancyPercent: 90,
    defaultAdherencePercent: 88,
    ...overrides
  }
  const updateProps = Object.fromEntries(
    Object.keys(props).map((key) => [`onUpdate:${key}`, (value) => wrapper.setProps({ [key]: value })])
  )

  wrapper = mount(PlanningGroupSettingsModal, {
    props: { ...props, ...updateProps },
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

  return wrapper
}

describe('PlanningGroupSettingsModal', () => {
  it('edits a voice service-level target', async () => {
    const wrapper = mountModal()

    expect(wrapper.text()).toContain('Service Level')
    expect(wrapper.text()).toContain('Contacts answered (%)')
    expect(wrapper.text()).toContain('Within (seconds)')

    await wrapper.get('#group-service-level-percent').setValue('85')
    await wrapper.get('#group-service-goal-threshold').setValue('30')
    await wrapper.get('button:last-of-type').trigger('click')

    expect(wrapper.props('serviceGoalPercent')).toBe(85)
    expect(wrapper.props('serviceGoalThreshold')).toBe(30)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('presents a compact email response target without the Phase 1 message', () => {
    const wrapper = mountModal({
      channelType: 'email',
      serviceGoalPercent: 90,
      serviceGoalThreshold: 24
    })

    expect(wrapper.text()).toContain('Response Target')
    expect(wrapper.text()).toContain('Emails responded to (%)')
    expect(wrapper.text()).toContain('Within (business hours)')
    expect(wrapper.text()).toContain('Productive Utilization (%)')
    expect(wrapper.text()).not.toContain('Phase 1 converts email volume')
    expect(wrapper.text()).not.toContain('does not simulate backlog aging')
  })
})
