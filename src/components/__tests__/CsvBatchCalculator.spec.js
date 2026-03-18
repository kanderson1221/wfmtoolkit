import { mount } from '@vue/test-utils'

import CsvBatchCalculator from '../CsvBatchCalculator.vue'

describe('CsvBatchCalculator', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a validation error when the workflow runs without a file', async () => {
    const wrapper = mount(CsvBatchCalculator)

    await wrapper.get('[data-test="run-batch-workflow"]').trigger('click')

    expect(global.fetch).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Upload a valid CSV file before running this workflow.')
  })
})
