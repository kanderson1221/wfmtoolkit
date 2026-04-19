const resolveNiceAxisStep = (range) => {
  if (!Number.isFinite(range) || range <= 0) {
    return 1
  }

  const roughStep = range / 5
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalized = roughStep / magnitude

  if (normalized <= 1) {
    return magnitude
  }

  if (normalized <= 2) {
    return 2 * magnitude
  }

  if (normalized <= 5) {
    return 5 * magnitude
  }

  return 10 * magnitude
}

export const resolveAdaptiveYAxisBounds = (
  values = [],
  {
    emptyMax = 100,
    singleValuePaddingFloor = 10,
    paddingFloor = 10,
    nearZeroFloor = 100,
    nearZeroRatio = 0.15
  } = {}
) => {
  const numericValues = (Array.isArray(values) ? values : []).filter((value) => Number.isFinite(value))

  if (!numericValues.length) {
    return {
      min: 0,
      max: emptyMax
    }
  }

  const rawMin = Math.min(...numericValues)
  const rawMax = Math.max(...numericValues)

  if (rawMin === rawMax) {
    if (rawMax === 0) {
      return {
        min: 0,
        max: 1
      }
    }

    const symmetricPad = Math.max(Math.abs(rawMax) * 0.12, singleValuePaddingFloor)
    const step = resolveNiceAxisStep(symmetricPad * 2)
    const minCandidate = Math.max(rawMin - symmetricPad, 0)

    return {
      min: Math.floor(minCandidate / step) * step,
      max: Math.ceil((rawMax + symmetricPad) / step) * step
    }
  }

  const range = rawMax - rawMin
  const padding = Math.max(range * 0.12, rawMax * 0.02, paddingFloor)
  const shouldAnchorZero = rawMin <= Math.max(rawMax * nearZeroRatio, nearZeroFloor)
  const minCandidate = shouldAnchorZero ? 0 : Math.max(rawMin - padding, 0)
  const maxCandidate = rawMax + padding
  const step = resolveNiceAxisStep(maxCandidate - minCandidate)

  return {
    min: Math.floor(minCandidate / step) * step,
    max: Math.ceil(maxCandidate / step) * step
  }
}
