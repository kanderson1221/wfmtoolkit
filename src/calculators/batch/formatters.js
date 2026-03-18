const integerFormatter = new Intl.NumberFormat()

export const formatCount = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0'
  return integerFormatter.format(Math.round(value))
}

export const formatVolume = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0'
  if (Math.abs(value - Math.round(value)) < 0.001) {
    return integerFormatter.format(Math.round(value))
  }
  return value.toFixed(1)
}

export const formatDecimal = (value, digits = 2) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0.00'
  return value.toFixed(digits)
}

export const formatPercent = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unstable'
  return `${(value * 100).toFixed(1)}%`
}

export const formatAsaSeconds = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unstable'
  return value.toFixed(1)
}

export const formatIntervalLabel = (value) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  const parsedDate = new Date(value)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const timeMatch = value.match(/(\d{1,2}:\d{2}\s*[APMapm]{2})/)
  if (timeMatch) {
    return timeMatch[1].toUpperCase()
  }

  return value
}
