import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

import AppTextField from '../AppTextField.vue'

describe('AppTextField', () => {
  it('binds and trims text input', async () => {
    const Host = defineComponent({
      components: { AppTextField },
      setup() {
        const value = ref('')
        return { value }
      },
      template: '<AppTextField v-model.trim="value" />'
    })

    const wrapper = mount(Host)
    const input = wrapper.get('input')

    await input.setValue('  workforce  ')

    expect(wrapper.vm.value).toBe('workforce')
  })
})
