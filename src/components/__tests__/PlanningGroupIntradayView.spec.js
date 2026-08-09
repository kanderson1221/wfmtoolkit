import { mount } from '@vue/test-utils'

import PlanningGroupIntradayView from '../planning/PlanningGroupIntradayView.vue'

describe('PlanningGroupIntradayView', () => {
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
  })

  it('normalizes the ratios and saves a stored intraday profile', async () => {
    const wrapper = buildWrapper({
      group: {
        id: 'group-1',
        name: 'Voice Support',
        intraday: {
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
      intervalLengthMinutes: 30
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
})
