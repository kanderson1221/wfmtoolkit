const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const buildDateFromIso = (value) => {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const candidate = new Date(year, month - 1, day, 12)

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  )
    ? candidate
    : null
}

const padTwo = (value) => String(value).padStart(2, '0')

export const dateToIsoValue = (date) =>
  `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`

export const buildMonthStart = (serviceDate = '') => `${serviceDate.slice(0, 7)}-01`

export const buildMonthStartFromDate = (date) =>
  dateToIsoValue(new Date(date.getFullYear(), date.getMonth(), 1, 12))

export const buildMonthEndFromDate = (date) =>
  dateToIsoValue(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12))

export const buildYearStart = (year) => `${year}-01-01`

export const buildYearEnd = (year) => `${year}-12-31`

export const maxIsoValue = (left, right) => {
  if (!left) {
    return right || null
  }

  if (!right) {
    return left
  }

  return left > right ? left : right
}

export const minIsoValue = (left, right) => {
  if (!left) {
    return right || null
  }

  if (!right) {
    return left
  }

  return left < right ? left : right
}

export const countMatchingIsoDatesInRange = (startIso, endIso, matcher) => {
  const startDate = buildDateFromIso(startIso)
  const endDate = buildDateFromIso(endIso)

  if (!startDate || !endDate || startDate.getTime() > endDate.getTime()) {
    return 0
  }

  let matchingDateCount = 0

  for (
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12);
    cursor.getTime() <= endDate.getTime();
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1, 12)
  ) {
    if (matcher(dateToIsoValue(cursor))) {
      matchingDateCount += 1
    }
  }

  return matchingDateCount
}
