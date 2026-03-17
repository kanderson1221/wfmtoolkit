import { mount } from '@vue/test-utils'

import AppDialog from '../AppDialog.vue'

const DialogStub = {
  name: 'Dialog',
  props: ['visible'],
  emits: ['hide', 'update:visible'],
  template: '<div class="dialog-stub"><slot name="header" /><slot /><slot name="footer" /></div>'
}

describe('AppDialog', () => {
  it('renders the dialog title and description', () => {
    const wrapper = mount(AppDialog, {
      props: {
        visible: true,
        title: 'Settings',
        description: 'Adjust the defaults'
      },
      global: {
        stubs: {
          Dialog: DialogStub
        }
      }
    })

    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Adjust the defaults')
  })

  it('emits close when the underlying dialog hides', async () => {
    const wrapper = mount(AppDialog, {
      props: {
        visible: true,
        title: 'Settings'
      },
      global: {
        stubs: {
          Dialog: DialogStub
        }
      }
    })

    wrapper.findComponent(DialogStub).vm.$emit('hide')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
