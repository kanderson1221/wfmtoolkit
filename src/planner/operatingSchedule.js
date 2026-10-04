export const OPERATING_SCHEDULE_CONFIGURED_HOURS = 'configured_hours'
export const OPERATING_SCHEDULE_ALWAYS_OPEN = 'always_open'
export const DEFAULT_OPERATING_INTERVAL_MINUTES = 30

const MINUTES_PER_DAY = 24 * 60

export const parseOperatingTimeToMinutes = (value) => {
  const normalized = String(value || '').trim()
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    return null
  }

  const [hours, minutes] = normalized.split(':').map(Number)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}

export const normalizeOperatingScheduleMode = (value, openTime = '', closeTime = '') => {
  if (value === OPERATING_SCHEDULE_ALWAYS_OPEN) {
    return OPERATING_SCHEDULE_ALWAYS_OPEN
  }

  if (value === OPERATING_SCHEDULE_CONFIGURED_HOURS) {
    return OPERATING_SCHEDULE_CONFIGURED_HOURS
  }

  const openMinutes = parseOperatingTimeToMinutes(openTime)
  const closeMinutes = parseOperatingTimeToMinutes(closeTime)
  return openMinutes != null && openMinutes === closeMinutes
    ? OPERATING_SCHEDULE_ALWAYS_OPEN
    : OPERATING_SCHEDULE_CONFIGURED_HOURS
}

export const isAlwaysOpenOperatingSchedule = (value) =>
  value === OPERATING_SCHEDULE_ALWAYS_OPEN

export const validateConfiguredOperatingWindow = ({
  openTime,
  closeTime,
  intervalLengthMinutes = DEFAULT_OPERATING_INTERVAL_MINUTES,
  allowBlank = false
} = {}) => {
  const openValue = String(openTime || '').trim()
  const closeValue = String(closeTime || '').trim()

  if (!openValue && !closeValue) {
    return {
      valid: Boolean(allowBlank),
      status: 'missing',
      message: allowBlank ? '' : 'Set the call center operating hours.'
    }
  }

  if (!openValue || !closeValue) {
    return {
      valid: false,
      status: 'incomplete',
      message: 'Enter both opening and closing times.'
    }
  }

  const openMinutes = parseOperatingTimeToMinutes(openValue)
  const closeMinutes = parseOperatingTimeToMinutes(closeValue)
  if (openMinutes == null || closeMinutes == null) {
    return {
      valid: false,
      status: 'invalid_time',
      message: 'Enter valid opening and closing times.'
    }
  }

  if (openMinutes === closeMinutes) {
    return {
      valid: false,
      status: 'equal_times',
      message: 'Select Open 24 hours for continuous operations.'
    }
  }

  if (openMinutes > closeMinutes) {
    return {
      valid: false,
      status: 'overnight_unsupported',
      message: 'Overnight operating windows are not supported yet. Closing time must be later than opening time.'
    }
  }

  const intervalLength = Math.max(Math.round(Number(intervalLengthMinutes) || DEFAULT_OPERATING_INTERVAL_MINUTES), 1)
  if (openMinutes % intervalLength !== 0 || closeMinutes % intervalLength !== 0) {
    return {
      valid: false,
      status: 'interval_misaligned',
      message: `Opening and closing times must align with ${intervalLength}-minute staffing intervals. Select Open 24 hours for continuous operations.`
    }
  }

  const durationMinutes = closeMinutes - openMinutes
  if (durationMinutes <= 0 || durationMinutes > MINUTES_PER_DAY || durationMinutes % intervalLength !== 0) {
    return {
      valid: false,
      status: 'invalid_duration',
      message: `The operating window must contain complete ${intervalLength}-minute staffing intervals.`
    }
  }

  return {
    valid: true,
    status: 'ready',
    message: '',
    openMinutes,
    closeMinutes,
    durationMinutes,
    intervalLengthMinutes: intervalLength
  }
}

export const describeOperatingWindow = ({ operatingScheduleMode, operatingOpenTime, operatingCloseTime } = {}) => {
  if (isAlwaysOpenOperatingSchedule(operatingScheduleMode)) {
    return 'Open 24 hours'
  }

  const open = String(operatingOpenTime || '').trim()
  const close = String(operatingCloseTime || '').trim()
  return open && close ? `${open} to ${close}` : 'Hours not set'
}
