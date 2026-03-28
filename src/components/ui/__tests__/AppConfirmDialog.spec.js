import { mount } from '@vue/test-utils'

import AppConfirmDialog from '../AppConfirmDialog.vue'

const AppDialogStub = {
  name: 'AppDialog',
  props: ['visible', 'title', 'description'],
  template: `
    <div class="dialog-stub">
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
      <slot />
      <slot name="footer" />
    </div>
  `
}

describe('AppConfirmDialog', () => {
  it('renders the confirmation copy and actions', () => {
    const wrapper = mount(AppConfirmDialog, {
      props: {
        visible: true,
        title: 'Delete Plan?',
        description: 'This removes the selected annual plan.',
        confirmLabel: 'Delete Plan'
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub
        }
      }
    })

    expect(wrapper.text()).toContain('Delete Plan?')
    expect(wrapper.text()).toContain('This removes the selected annual plan.')
    expect(wrapper.text()).toContain('Cancel')
    expect(wrapper.text()).toContain('Delete Plan')
  })

  it('emits confirm and closes when the primary action is pressed', async () => {
    const wrapper = mount(AppConfirmDialog, {
      props: {
        visible: true,
        title: 'Delete Plan?',
        confirmLabel: 'Delete Plan'
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub
        }
      }
    })

    await wrapper.get('button:last-of-type').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
  })

  it('closes without confirming when cancel is pressed', async () => {
    const wrapper = mount(AppConfirmDialog, {
      props: {
        visible: true,
        title: 'Delete Plan?'
      },
      global: {
        stubs: {
          AppDialog: AppDialogStub
        }
      }
    })

    await wrapper.get('button:first-of-type').trigger('click')

    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
  })
})
