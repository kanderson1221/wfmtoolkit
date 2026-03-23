import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

import AppSelect from '../AppSelect.vue'

describe('AppSelect', () => {
  it('supports plain mode without applying default field chrome', async () => {
    const Host = defineComponent({
      components: { AppSelect },
      setup() {
        const value = ref('one')
        const options = [
          { label: 'One', value: 'one' },
          { label: 'Two', value: 'two' }
        ]
        return { value, options }
      },
      template:
        '<AppSelect v-model="value" :options="options" plain class="plain-select" aria-label="Test select" />'
    })

    const wrapper = mount(Host)
    const select = wrapper.get('select')

    expect(select.classes()).toContain('plain-select')
    expect(select.classes()).not.toContain('rounded-2xl')
    expect(select.classes()).not.toContain('rounded-xl')

    await select.setValue('two')

    expect(wrapper.vm.value).toBe('two')
  })
})
