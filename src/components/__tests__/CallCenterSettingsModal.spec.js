import { mount } from '@vue/test-utils'

import CallCenterSettingsModal from '../planning/CallCenterSettingsModal.vue'
import { createHolidayTemplateHolidays } from '../../planner/holidayCalendars'

const AppDialogStub = {
  name: 'AppDialog',
  template: '<div class="dialog-stub"><slot /><slot name="footer" /></div>'
}

const mountModal = (props = {}) => {
  let wrapper = null
  let queuedPropUpdates = {}
  const syncProps = (patch) => {
    if (wrapper) {
      return wrapper.setProps(patch)
    }

    queuedPropUpdates = {
      ...queuedPropUpdates,
      ...patch
    }

    return Promise.resolve()
  }

  wrapper = mount(CallCenterSettingsModal, {
    props: {
      centerName: 'North America Operations',
      holidayProfiles: [],
      displayYear: 2026,
      operatingWeekdays: [1, 2, 3, 4, 5],
      weekdayOptions: [
        { value: 0, label: 'Sun' },
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' },
        { value: 6, label: 'Sat' }
      ],
      'onUpdate:operatingWeekdays': (value) => syncProps({ operatingWeekdays: value }),
      'onUpdate:holidayProfiles': (value) => syncProps({ holidayProfiles: value }),
      ...props
    },
    global: {
      stubs: {
        AppDialog: AppDialogStub
      }
    }
  })

  if (Object.keys(queuedPropUpdates).length) {
    void wrapper.setProps(queuedPropUpdates)
  }

  return wrapper
}

const findButtonByText = (wrapper, label) =>
  wrapper.findAll('button').find((button) => button.text().trim() === label)

describe('CallCenterSettingsModal', () => {
  it('shows Monday through Friday as the default operating-day selection', () => {
    const wrapper = mountModal()
    const weekdayButtons = wrapper.findAll('button').filter((button) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(button.text()))

    expect(weekdayButtons.find((button) => button.text() === 'Mon')?.attributes('aria-pressed')).toBe('true')
    expect(weekdayButtons.find((button) => button.text() === 'Tue')?.attributes('aria-pressed')).toBe('true')
    expect(weekdayButtons.find((button) => button.text() === 'Wed')?.attributes('aria-pressed')).toBe('true')
    expect(weekdayButtons.find((button) => button.text() === 'Thu')?.attributes('aria-pressed')).toBe('true')
    expect(weekdayButtons.find((button) => button.text() === 'Fri')?.attributes('aria-pressed')).toBe('true')
    expect(weekdayButtons.find((button) => button.text() === 'Sun')?.attributes('aria-pressed')).toBe('false')
    expect(weekdayButtons.find((button) => button.text() === 'Sat')?.attributes('aria-pressed')).toBe('false')
  })

  it('updates the operating-day selection when a weekday is toggled', async () => {
    const wrapper = mountModal()
    const saturdayButton = wrapper.findAll('button').find((button) => button.text() === 'Sat')
    const mondayButton = wrapper.findAll('button').find((button) => button.text() === 'Mon')

    await saturdayButton.trigger('click')
    expect(wrapper.props('operatingWeekdays')).toEqual([1, 2, 3, 4, 5, 6])

    await mondayButton.trigger('click')
    expect(wrapper.props('operatingWeekdays')).toEqual([2, 3, 4, 5, 6])
  })

  it('loads U.S. holidays into the selected holiday year profile', async () => {
    const wrapper = mountModal({
      displayYear: 2027,
      holidayProfiles: []
    })

    await findButtonByText(wrapper, 'Load U.S. Holidays').trigger('click')

    expect(wrapper.props('holidayProfiles')).toHaveLength(1)
    expect(wrapper.props('holidayProfiles')[0].year).toBe(2027)
    expect(wrapper.props('holidayProfiles')[0].customHolidays.some((holiday) => holiday.date.startsWith('2027-'))).toBe(true)
  })

  it('copies the prior year holiday schedule into the selected year', async () => {
    const wrapper = mountModal({
      displayYear: 2027,
      holidayProfiles: [
        {
          year: 2026,
          customHolidays: [
            createHolidayTemplateHolidays('us_federal', 2026).find((holiday) => holiday.id === 'thanksgiving_day'),
            {
              id: 'company-day',
              label: 'Company Day',
              date: '2026-12-26'
            }
          ]
        }
      ]
    })

    await findButtonByText(wrapper, 'Copy 2026').trigger('click')

    const copiedProfile = wrapper.props('holidayProfiles').find((profile) => profile.year === 2027)

    expect(copiedProfile).toBeTruthy()
    expect(copiedProfile.customHolidays.find((holiday) => holiday.id === 'thanksgiving_day')?.date).toBe('2027-11-25')
    expect(copiedProfile.customHolidays.find((holiday) => holiday.id === 'company-day')?.date).toBe('2027-12-26')
  })
})
