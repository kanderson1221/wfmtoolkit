export const cloneMonthValues = (months, monthIndex) => ({ ...months[monthIndex] })

export const copyMonthToAll = (months, monthIndex) => {
  const source = cloneMonthValues(months, monthIndex)
  return months.map(() => ({ ...source }))
}

export const copyMonthForward = (months, monthIndex) => {
  const source = cloneMonthValues(months, monthIndex)
  return months.map((month, index) => (index >= monthIndex ? { ...source } : month))
}

export const copyQuarterForward = (months, monthIndex, quarterSize = 3) => {
  const source = cloneMonthValues(months, monthIndex)
  const quarterStart = Math.floor(monthIndex / quarterSize) * quarterSize
  const quarterEnd = Math.min(quarterStart + quarterSize, months.length)

  return months.map((month, index) =>
    index >= monthIndex && index < quarterEnd ? { ...source } : month
  )
}
