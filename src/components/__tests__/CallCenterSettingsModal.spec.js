import { mount } from '@vue/test-utils'

import CallCenterSettingsModal from '../planning/CallCenterSettingsModal.vue'
import { createHolidayTemplateHolidays } from '../../planner/holidayCalendars'

const AppDialogStub = {
  name: 'AppDialog',
  props: ['title', 'description'],
  template: `
    <div class="dialog-stub">
      <h2 v-if="title">{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
      <slot />
      <slot name="footer" />
    </div>
  `
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
      operatingScheduleMode: 'configured_hours',
      operatingOpenTime: '',
      operatingCloseTime: '',
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
      'onUpdate:operatingScheduleMode': (value) => syncProps({ operatingScheduleMode: value }),
      'onUpdate:operatingOpenTime': (value) => syncProps({ operatingOpenTime: value }),
      'onUpdate:operatingCloseTime': (value) => syncProps({ operatingCloseTime: value }),
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
  it('explains that holiday schedules should cover historical and future forecasting years', () => {
    const wrapper = mountModal({
      displayYear: 2026
    })

    expect(wrapper.text()).toContain(
      'Forecasting depends on holiday schedules being set up for historical and future years. Saved plans keep their own 2026 holiday snapshot.'
    )
  })

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

  it('captures operating hours and validates that close time is later than open time', async () => {
    const wrapper = mountModal()
    const openTimeInput = wrapper.find('#call-center-open-time')
    const closeTimeInput = wrapper.find('#call-center-close-time')

    await openTimeInput.setValue('09:00')
    await closeTimeInput.setValue('17:30')

    expect(wrapper.props('operatingOpenTime')).toBe('09:00')
    expect(wrapper.props('operatingCloseTime')).toBe('17:30')
    expect(wrapper.text()).not.toContain('Hours of operation: 09:00 to 17:30.')

    await closeTimeInput.setValue('08:30')

    expect(wrapper.text()).toContain('Closing time must be later than opening time.')
    expect(findButtonByText(wrapper, 'Save Call Center').attributes('disabled')).toBeDefined()
  })

  it('supports explicit 24-hour operation and disables configured time inputs', async () => {
    const wrapper = mountModal()

    await wrapper.get('#call-center-always-open').setValue(true)

    expect(wrapper.props('operatingScheduleMode')).toBe('always_open')
    expect(wrapper.get('#call-center-open-time').attributes('disabled')).toBeDefined()
    expect(wrapper.get('#call-center-close-time').attributes('disabled')).toBeDefined()
    expect(findButtonByText(wrapper, 'Save Call Center').attributes('disabled')).toBeUndefined()
  })

  it('rejects 23:59 because configured hours must align to 30-minute intervals', async () => {
    const wrapper = mountModal()

    await wrapper.get('#call-center-open-time').setValue('00:00')
    await wrapper.get('#call-center-close-time').setValue('23:59')

    expect(wrapper.text()).toContain('30-minute staffing intervals')
    expect(findButtonByText(wrapper, 'Save Call Center').attributes('disabled')).toBeDefined()
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

  it('includes seven historical and seven future holiday years around the selected year', () => {
    const wrapper = mountModal({
      displayYear: 2026
    })

    const holidayYearSelect = wrapper.find('#holiday-year')
    const optionValues = holidayYearSelect.findAll('option').map((option) => option.element.value)

    expect(optionValues).toContain('2019')
    expect(optionValues).toContain('2033')
  })

  it('still extends historical years down to the earliest staffing-group data year when needed', () => {
    const wrapper = mountModal({
      displayYear: 2026,
      minimumHolidayYear: 2017
    })

    const holidayYearSelect = wrapper.find('#holiday-year')
    const optionValues = holidayYearSelect.findAll('option').map((option) => option.element.value)

    expect(optionValues).toContain('2017')
    expect(optionValues).toContain('2033')
  })

  it('renders holiday rows in a compact shared-header layout', () => {
    const wrapper = mountModal({
      displayYear: 2027,
      holidayProfiles: [
        {
          year: 2027,
          customHolidays: [
            {
              id: 'new-years-day',
              label: 'New Year\'s Day',
              date: '2027-01-01'
            },
            {
              id: 'company-day',
              label: 'Company Day',
              date: '2027-07-16'
            }
          ]
        }
      ]
    })

    expect(wrapper.text()).toContain('Holiday')
    expect(wrapper.text()).toContain('Date')
    expect(wrapper.text()).not.toContain('Holiday Name')
    expect(wrapper.findAll('input[aria-label^="Holiday name"]').length).toBe(2)
    expect(wrapper.findAll('input[aria-label^="Holiday date"]').length).toBe(2)
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

  it('confirms before replacing an existing holiday schedule with the prior year copy', async () => {
    const wrapper = mountModal({
      displayYear: 2027,
      holidayProfiles: [
        {
          year: 2026,
          customHolidays: [
            {
              id: 'company-day-prior',
              label: 'Company Day',
              date: '2026-12-26'
            }
          ]
        },
        {
          year: 2027,
          customHolidays: [
            {
              id: 'existing-day',
              label: 'Existing Day',
              date: '2027-06-15'
            }
          ]
        }
      ]
    })

    await findButtonByText(wrapper, 'Copy 2026').trigger('click')

    expect(wrapper.text()).toContain('Replace 2027 Holiday Schedule?')
    expect(wrapper.props('holidayProfiles').find((profile) => profile.year === 2027)?.customHolidays).toEqual([
      expect.objectContaining({
        id: 'existing-day',
        label: 'Existing Day',
        date: '2027-06-15'
      })
    ])

    await findButtonByText(wrapper, 'Replace Holiday Schedule').trigger('click')

    expect(wrapper.props('holidayProfiles').find((profile) => profile.year === 2027)?.customHolidays).toEqual([
      expect.objectContaining({
        id: 'company-day-prior',
        label: 'Company Day',
        date: '2027-12-26'
      })
    ])
  })
})
