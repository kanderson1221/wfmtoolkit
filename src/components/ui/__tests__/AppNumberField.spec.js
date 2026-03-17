import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

import AppNumberField from '../AppNumberField.vue'

describe('AppNumberField', () => {
  it('binds numeric values without grouping', async () => {
    const Host = defineComponent({
      components: { AppNumberField },
      setup() {
        const value = ref(0)
        return { value }
      },
      template: '<AppNumberField v-model="value" :min-fraction-digits="0" :max-fraction-digits="1" />'
    })

    const wrapper = mount(Host)
    const input = wrapper.get('input')

    await input.setValue('12.5')
    await input.trigger('blur')

    expect(wrapper.vm.value).toBe(12.5)
  })
})
