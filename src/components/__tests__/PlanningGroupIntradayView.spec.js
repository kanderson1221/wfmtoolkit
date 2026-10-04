import { mount } from '@vue/test-utils'

import PlanningGroupIntradayView from '../planning/PlanningGroupIntradayView.vue'

describe('PlanningGroupIntradayView', () => {
  const flushPromises = async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }

  const buildWrapper = (props = {}) =>
    mount(PlanningGroupIntradayView, {
      props: {
        center: {
          id: 'center-1',
          operatingOpenTime: '08:00',
          operatingCloseTime: '10:00'
        },
        group: {
          id: 'group-1',
          name: 'Voice Support',
          intraday: {
            minimumHeadcount: 2,
            intervalRatios: [
              { startTime: '08:00', ratioPercent: 30 },
              { startTime: '08:30', ratioPercent: 30 },
              { startTime: '09:00', ratioPercent: 20 },
              { startTime: '09:30', ratioPercent: 20 }
            ]
          }
        },
        formatNumber: (value, digits = 1) =>
          Number(value ?? 0).toLocaleString('en-US', {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
          }),
        ...props
      }
    })

  it('renders the shared 30-minute ratio configuration', () => {
    const wrapper = buildWrapper()

    expect(wrapper.text()).toContain('Intraday Inputs')
    expect(wrapper.text()).toContain('30-minute intervals')
    expect(wrapper.text()).toContain('08:00 - 08:30')
    expect(wrapper.text()).toContain('09:30 - 10:00')
    expect(wrapper.text()).toContain('Operating Window')
    expect(wrapper.text()).toContain('08:00 to 10:00')
    expect(wrapper.text()).toContain('Minimum Headcount per Open Interval')
    expect(wrapper.text()).toContain('Import Interval Ratios')
    const templateLink = wrapper.findAll('a').find((node) => node.text().includes('Download Sample Template'))
    expect(templateLink.attributes('href')).toBe('/planning_group_intraday_ratios_template.csv')
    expect(templateLink.attributes()).toHaveProperty('download')
  })

  it('normalizes the ratios and saves a stored intraday profile', async () => {
    const wrapper = buildWrapper({
      group: {
        id: 'group-1',
        name: 'Voice Support',
        intraday: {
          minimumHeadcount: 3,
          intervalRatios: [
            { startTime: '08:00', ratioPercent: 50 },
            { startTime: '08:30', ratioPercent: 25 },
            { startTime: '09:00', ratioPercent: 25 },
            { startTime: '09:30', ratioPercent: 25 }
          ]
        }
      }
    })

    const normalizeButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Normalize to 100%')
    await normalizeButton.trigger('click')

    const saveButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Save Intraday')
    await saveButton.trigger('click')

    expect(wrapper.emitted('save-intraday')).toHaveLength(1)
    expect(wrapper.emitted('save-intraday')[0][0]).toMatchObject({
      intervalLengthMinutes: 30,
      minimumHeadcount: 3
    })
    expect(wrapper.emitted('save-intraday')[0][0].intervalRatios).toHaveLength(4)
    expect(
      wrapper.emitted('save-intraday')[0][0].intervalRatios.reduce((sum, row) => sum + row.ratioPercent, 0)
    ).toBe(100)
  })

  it('renders a complete 48-interval profile for an always-open center', () => {
    const wrapper = buildWrapper({
      center: {
        id: 'center-1',
        operatingScheduleMode: 'always_open',
        operatingOpenTime: '',
        operatingCloseTime: ''
      },
      group: {
        id: 'group-1',
        name: 'Voice Support',
        intraday: {}
      }
    })

    expect(wrapper.text()).toContain('Open 24 hours')
    expect(wrapper.findAll('tbody tr')).toHaveLength(48)
    expect(wrapper.text()).toContain('00:00 - 00:30')
    expect(wrapper.text()).toContain('23:30 - 00:00')
  })

  it('imports a complete CSV profile and saves the imported ratios', async () => {
    const wrapper = buildWrapper()
    const file = {
      name: 'intraday-ratios.csv',
      text: vi.fn(async () => [
        'interval_start,ratio_percent',
        '08:00,10',
        '08:30,20',
        '09:00,30',
        '09:30,40'
      ].join('\n'))
    }
    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [file]
    })

    await fileInput.trigger('change')
    await flushPromises()

    expect(wrapper.text()).toContain('Imported 4 interval ratios from intraday-ratios.csv')
    const saveButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Save Intraday')
    await saveButton.trigger('click')

    expect(wrapper.emitted('save-intraday')[0][0].intervalRatios.map((row) => row.ratioPercent)).toEqual([
      10,
      20,
      30,
      40
    ])
  })

  it('rejects an incomplete import without replacing the current ratios', async () => {
    const wrapper = buildWrapper()
    const file = {
      name: 'partial-ratios.csv',
      text: vi.fn(async () => 'interval_start,ratio_percent\n08:00,50\n08:30,50\n')
    }
    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [file]
    })

    await fileInput.trigger('change')
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to import partial-ratios.csv')
    expect(wrapper.text()).toContain('Include every active interval. Missing 2: 09:00, 09:30.')
    const saveButton = wrapper.findAll('button').find((node) => node.text().trim() === 'Save Intraday')
    await saveButton.trigger('click')

    expect(wrapper.emitted('save-intraday')[0][0].intervalRatios.map((row) => row.ratioPercent)).toEqual([
      30,
      30,
      20,
      20
    ])
  })
})
