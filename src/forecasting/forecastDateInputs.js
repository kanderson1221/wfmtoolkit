const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const parseDateInputValue = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12)
  }

  if (typeof value === 'string') {
    const match = value.match(DATE_INPUT_PATTERN)
    if (match) {
      const [, yearText, monthText, dayText] = match
      const year = Number(yearText)
      const monthIndex = Number(monthText) - 1
      const day = Number(dayText)
      const normalized = new Date(year, monthIndex, day, 12)

      return normalized.getFullYear() === year &&
        normalized.getMonth() === monthIndex &&
        normalized.getDate() === day
        ? normalized
        : null
    }
  }

  const normalized = new Date(value)
  return Number.isNaN(normalized.getTime()) ? null : normalized
}

export const formatDateInputValue = (date) => {
  if (typeof date === 'string' && DATE_INPUT_PATTERN.test(date)) {
    return date
  }

  const normalized = parseDateInputValue(date)
  if (!normalized) {
    return ''
  }

  const year = normalized.getFullYear()
  const month = String(normalized.getMonth() + 1).padStart(2, '0')
  const day = String(normalized.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
