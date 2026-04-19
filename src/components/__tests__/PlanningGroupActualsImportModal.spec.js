import { mount } from '@vue/test-utils'

import PlanningGroupActualsImportModal from '../planning/PlanningGroupActualsImportModal.vue'

const AppButtonStub = {
  name: 'AppButton',
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>'
}

const AppDialogStub = {
  name: 'AppDialog',
  props: ['visible', 'title', 'description', 'kicker'],
  template: `
    <div v-if="visible">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <slot />
      <slot name="footer" />
    </div>
  `
}

const AppStatStripStub = {
  name: 'AppStatStrip',
  props: ['items'],
  template: `
    <div>
      <div v-for="item in items" :key="item.label">
        <span>{{ item.label }}</span>
        <span>{{ item.value }}</span>
        <span>{{ item.meta }}</span>
      </div>
    </div>
  `
}

const AppStatusMessageStub = {
  name: 'AppStatusMessage',
  template: '<div><slot /></div>'
}

const PlanningGroupActualsUploadSectionStub = {
  name: 'PlanningGroupActualsUploadSection',
  props: ['state', 'columnOptions'],
  emits: ['file-select'],
  template: '<div />'
}

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const buildWrapper = (props = {}) =>
  mount(PlanningGroupActualsImportModal, {
    props: {
      visible: true,
      actuals: {
        sourceMode: 'daily_upload',
        dailyRows: [
          { serviceDate: '2026-01-01', contacts: 100, ahtSeconds: 300 },
          { serviceDate: '2025-12-31', contacts: 90, ahtSeconds: 280 }
        ]
      },
      formatWhole: (value) => String(Math.round(Number(value ?? 0))),
      formatNumber: (value, digits = 1) =>
        Number(value ?? 0).toLocaleString('en-US', {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        }),
      ...props
    },
    global: {
      stubs: {
        AppButton: AppButtonStub,
        AppDialog: AppDialogStub,
        AppStatStrip: AppStatStripStub,
        AppStatusMessage: AppStatusMessageStub,
        PlanningGroupActualsUploadSection: PlanningGroupActualsUploadSectionStub
      }
    }
  })

describe('PlanningGroupActualsImportModal', () => {
  it('shows how many daily rows will be added versus replaced', async () => {
    const wrapper = buildWrapper()
    const fakeFile = {
      name: 'actuals.csv',
      text: vi.fn().mockResolvedValue(
        'service_date,contacts,average_handle_time_seconds\n2026-01-01,120,315\n2026-01-02,80,260\n'
      )
    }

    const uploadSection = wrapper.findComponent(PlanningGroupActualsUploadSectionStub)
    uploadSection.vm.$emit('file-select', {
      target: {
        files: [fakeFile]
      }
    })
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('This upload will add 1 daily row and replace 1 existing day with the newly uploaded values.')
  })
})
