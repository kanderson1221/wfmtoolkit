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

  it('uploads the selected CSV file directly and shows the enriched download action', async () => {
    const file = new File(['queue_id,interval_start\nsales,2026-03-08T09:00:00Z'], 'sample.csv', {
      type: 'text/csv'
    })
    file.text = vi.fn(() => Promise.resolve('should not be read'))

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: 'file-processor',
        processedRows: 2,
        successfulRows: 2,
        failedRows: 0,
        errorCount: 0,
        errorsPreview: [],
        downloads: {
          enrichedFile: {
            fileId: 'abc123',
            fileName: 'sample_enriched.csv',
            downloadUrl: '/api/erlang-c/batch/file-processor/download/abc123',
            expiresAt: '2026-03-22T10:00:00+00:00'
          }
        },
        summary: {
          processedRows: 2,
          successfulRows: 2,
          failedRows: 0,
          totalCallsOffered: 330,
          avgServiceLevel: 0.84,
          avgAsaSeconds: 8.2,
          totalRequiredStaffMinutesNet: 120,
          totalRequiredStaffHoursNet: 2,
          totalRequiredStaffMinutesGross: 156,
          totalRequiredStaffHoursGross: 2.6,
          peakStaffNet: 12,
          peakStaffGross: 16
        }
      })
    })

    const wrapper = mount(CsvBatchCalculator)
    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      configurable: true
    })

    await fileInput.trigger('change')
    await wrapper.get('[data-test="run-batch-workflow"]').trigger('click')

    expect(file.text).not.toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/erlang-c/batch/file-processor/upload',
      expect.objectContaining({
        method: 'POST',
        body: file,
        headers: expect.objectContaining({
          'Content-Type': 'text/csv',
          'X-Upload-Filename': 'sample.csv'
        })
      })
    )
    expect(wrapper.text()).toContain('Download Enriched File')
    expect(wrapper.text()).toContain('330')
  })

  it('shows the error preview and error report download when the upload has row issues', async () => {
    const file = new File(['queue_id,interval_start\nsales,2026-03-08T09:00:00Z'], 'bad.csv', {
      type: 'text/csv'
    })

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: 'file-processor',
        processedRows: 2,
        successfulRows: 1,
        failedRows: 1,
        errorCount: 125,
        errorsPreview: [{ rowIndex: 2, message: 'Input should be greater than 0' }],
        downloads: {
          errorReport: {
            fileId: 'err123',
            fileName: 'bad_error_report.csv',
            downloadUrl: '/api/erlang-c/batch/file-processor/download/err123',
            expiresAt: '2026-03-22T10:00:00+00:00'
          }
        },
        summary: {
          processedRows: 2,
          successfulRows: 1,
          failedRows: 1,
          totalCallsOffered: 180,
          avgServiceLevel: 0.8,
          avgAsaSeconds: 10,
          totalRequiredStaffMinutesNet: 60,
          totalRequiredStaffHoursNet: 1,
          totalRequiredStaffMinutesGross: 78,
          totalRequiredStaffHoursGross: 1.3,
          peakStaffNet: 10,
          peakStaffGross: 13
        }
      })
    })

    const wrapper = mount(CsvBatchCalculator)
    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      configurable: true
    })

    await fileInput.trigger('change')
    await wrapper.get('[data-test="run-batch-workflow"]').trigger('click')

    expect(wrapper.text()).toContain('Download Error Report')
    expect(wrapper.text()).toContain('Showing first 1 of 125 row errors.')
    expect(wrapper.text()).toContain('Input should be greater than 0')
  })
})
