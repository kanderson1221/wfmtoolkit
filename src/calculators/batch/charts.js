export const buildChartMeta = (selectedMode) => {
  if (selectedMode === 'daily-plan') {
    return {
      title: 'Interval Trend',
      description:
        'Stacked bars show required agents and headcount add-on from shrinkage. Line shows interval call volume.',
      leftAxis: 'Calls Offered',
      rightAxis: 'Required Headcount',
      lineLegend: 'Calls Offered',
      barLegend: 'Required Agents',
      addonLegend: 'Headcount Add-On'
    }
  }

  if (selectedMode === 'weekly-plan') {
    return {
      title: 'Weekly Staffing Trend',
      description: 'Bars show recommended daily FTE. Line shows required headcount-hours by day.',
      leftAxis: 'Headcount Hours',
      rightAxis: 'Daily FTE',
      lineLegend: 'Required Headcount Hours',
      barLegend: 'Recommended Daily FTE'
    }
  }

  return {
    title: 'Interval Trend',
    description: 'Bars show required headcount. Line shows interval call volume.',
    leftAxis: 'Calls Offered',
    rightAxis: 'Required Headcount',
    lineLegend: 'Calls Offered',
    barLegend: 'Required Headcount'
  }
}

export const niceCeiling = (value) => {
  if (!Number.isFinite(value) || value <= 0) return 1
  if (value <= 10) return Math.ceil(value)

  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  if (normalized <= 1) return magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

export const buildChartSeries = ({
  selectedMode,
  hasSubmitted,
  calculatedRows,
  results,
  parsedRows,
  formatIntervalLabel
}) => {
  if (!hasSubmitted) return []
  if (selectedMode === 'file-processor') return []

  if (selectedMode === 'daily-plan') {
    return calculatedRows
      .map((row) => {
        const source = parsedRows[row.rowIndex - 1] ?? {}
        const requiredAgents = Number(row.requiredStaffNet)
        const requiredHeadcount = Number(row.requiredStaffGross)
        const headcountAddon = Math.max(0, requiredHeadcount - requiredAgents)
        return {
          label: formatIntervalLabel(row.intervalStart),
          lineValue: Number(source.calls_offered),
          barValue: requiredHeadcount,
          requiredAgents,
          headcountAddon
        }
      })
      .filter(
        (point) =>
          typeof point.label === 'string' &&
          point.label.length > 0 &&
          Number.isFinite(point.lineValue) &&
          Number.isFinite(point.barValue) &&
          Number.isFinite(point.requiredAgents) &&
          Number.isFinite(point.headcountAddon)
      )
  }

  if (selectedMode === 'weekly-plan') {
    return results
      .map((row) => ({
        label: row.serviceDate,
        lineValue: Number(row.requiredHeadcountHours),
        barValue: Number(row.recommendedDailyFte)
      }))
      .filter(
        (point) =>
          typeof point.label === 'string' &&
          point.label.length > 0 &&
          Number.isFinite(point.lineValue) &&
          Number.isFinite(point.barValue)
      )
  }

  return calculatedRows
    .map((row) => {
      const source = parsedRows[row.rowIndex - 1] ?? {}
      return {
        label: formatIntervalLabel(row.intervalStart),
        lineValue: Number(source.calls_offered),
        barValue: Number(row.requiredStaffGross)
      }
    })
    .filter(
      (point) =>
        typeof point.label === 'string' &&
        point.label.length > 0 &&
        Number.isFinite(point.lineValue) &&
        Number.isFinite(point.barValue)
    )
}

export const buildDailyScheduleSeries = ({
  selectedMode,
  scheduleCoverage,
  formatIntervalLabel
}) => {
  if (selectedMode !== 'daily-plan') return []
  if (!Array.isArray(scheduleCoverage) || scheduleCoverage.length === 0) return []

  return scheduleCoverage
    .map((row) => {
      const requiredAgents = Number(row.requiredAgents)
      const requiredHeadcount = Number(row.requiredHeadcount)
      const shrinkageOverhead = Number(row.shrinkageOverhead)
      const plannedHeadcount = Number(row.plannedHeadcount)
      const coverageGap = Number(row.coverageGap)
      const coverageOverage = Number(row.coverageOverage)
      return {
        intervalStart: row.intervalStart,
        label: formatIntervalLabel(row.intervalStart),
        requiredAgents: Number.isFinite(requiredAgents) ? requiredAgents : 0,
        requiredHeadcount: Number.isFinite(requiredHeadcount) ? requiredHeadcount : 0,
        shrinkageOverhead: Number.isFinite(shrinkageOverhead)
          ? shrinkageOverhead
          : Math.max(
              0,
              (Number.isFinite(requiredHeadcount) ? requiredHeadcount : 0) -
                (Number.isFinite(requiredAgents) ? requiredAgents : 0)
            ),
        plannedHeadcount: Number.isFinite(plannedHeadcount) ? plannedHeadcount : 0,
        coverageGap: Number.isFinite(coverageGap) ? coverageGap : 0,
        coverageOverage: Number.isFinite(coverageOverage) ? coverageOverage : 0
      }
    })
    .filter((row) => row.label.length > 0)
}

export const buildScheduleCoverageChart = ({
  selectedMode,
  dailyScheduleSeries,
  formatCount
}) => {
  const data = dailyScheduleSeries
  if (selectedMode !== 'daily-plan' || data.length === 0) return null

  const width = 980
  const height = 420
  const padding = { top: 36, right: 70, bottom: 74, left: 70 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const pointCount = data.length

  const maxStack = data.reduce(
    (peak, point) => Math.max(peak, point.requiredHeadcount, point.plannedHeadcount),
    0
  )
  const axisMax = niceCeiling(maxStack)
  const barSlotWidth = pointCount > 1 ? plotWidth / pointCount : plotWidth * 0.5
  const barWidth = Math.max(1, Math.min(barSlotWidth * 0.72, 30))
  const xAt = (index) =>
    padding.left + (pointCount === 1 ? plotWidth / 2 : barSlotWidth * (index + 0.5))
  const yForValue = (value) => padding.top + plotHeight - (value / axisMax) * plotHeight
  const zeroY = yForValue(0)

  const hoverWidth = pointCount > 1 ? barSlotWidth : plotWidth * 0.5
  const points = data.map((point, index) => {
    const x = xAt(index)
    const requiredAgentsY = yForValue(point.requiredAgents)
    const requiredHeadcountY = yForValue(point.requiredHeadcount)
    const plannedY = yForValue(point.plannedHeadcount)
    return {
      ...point,
      index,
      x,
      barX: x - barWidth / 2,
      barWidth,
      hoverX: x - hoverWidth / 2,
      hoverWidth,
      requiredAgentsY,
      requiredHeadcountY,
      plannedY,
      baseHeight: Math.max(0, zeroY - requiredAgentsY),
      overheadHeight: Math.max(0, requiredAgentsY - requiredHeadcountY)
    }
  })

  const plannedLinePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.plannedY}`)
    .join(' ')

  const yTickCount = 4
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) => {
    const ratio = index / yTickCount
    const y = padding.top + ratio * plotHeight
    return {
      y,
      value: formatCount(axisMax * (1 - ratio))
    }
  })

  const targetTicks = 8
  const xTickStep = Math.max(1, Math.ceil(pointCount / targetTicks))
  const xTickIndexes = []
  for (let index = 0; index < pointCount; index += xTickStep) {
    xTickIndexes.push(index)
  }
  if (xTickIndexes[xTickIndexes.length - 1] !== pointCount - 1) {
    xTickIndexes.push(pointCount - 1)
  }

  const xTicks = xTickIndexes.map((index) => ({
    x: points[index].x,
    label: points[index].label
  }))

  return {
    width,
    height,
    padding,
    points,
    yTicks,
    xTicks,
    plannedLinePath
  }
}

export const buildScheduleTimeline = ({
  selectedMode,
  scheduleCoverage,
  formatIntervalLabel
}) => {
  if (selectedMode !== 'daily-plan') return null
  if (!Array.isArray(scheduleCoverage) || scheduleCoverage.length === 0) return null
  const intervals = scheduleCoverage.map((row) => ({
    raw: row.intervalStart,
    label: formatIntervalLabel(row.intervalStart)
  }))

  const targetTicks = 10
  const intervalCount = intervals.length
  const tickStep = Math.max(1, Math.ceil(intervalCount / targetTicks))
  const ticks = []
  for (let index = 0; index < intervalCount; index += tickStep) {
    ticks.push({
      index,
      label: intervals[index].label
    })
  }
  if (ticks[ticks.length - 1]?.index !== intervalCount - 1) {
    ticks.push({
      index: intervalCount - 1,
      label: intervals[intervalCount - 1].label
    })
  }

  return {
    intervals,
    ticks,
    intervalCount
  }
}

export const buildScheduleGanttRows = ({
  selectedMode,
  scheduleTimeline,
  agentSchedules,
  formatIntervalLabel
}) => {
  if (selectedMode !== 'daily-plan') return []
  if (!scheduleTimeline || scheduleTimeline.intervalCount <= 0) return []
  if (!Array.isArray(agentSchedules) || agentSchedules.length === 0) return []

  const intervalCount = scheduleTimeline.intervalCount
  const toPct = (index) => (index / intervalCount) * 100
  const widthPct = (start, endInclusive) => ((endInclusive - start + 1) / intervalCount) * 100
  return agentSchedules
    .map((agent, index) => {
      const shiftStartIndex = Number(agent.shiftStartIndex)
      const shiftEndIndex = Number(agent.shiftEndIndex)
      const lunchStartIndex =
        agent.lunchStartIndex === null || agent.lunchStartIndex === undefined
          ? null
          : Number(agent.lunchStartIndex)
      const lunchEndIndex =
        agent.lunchEndIndex === null || agent.lunchEndIndex === undefined
          ? null
          : Number(agent.lunchEndIndex)
      if (
        !Number.isFinite(shiftStartIndex) ||
        !Number.isFinite(shiftEndIndex) ||
        shiftStartIndex < 0 ||
        shiftEndIndex < shiftStartIndex
      ) {
        return null
      }

      const segments = []
      if (
        lunchStartIndex !== null &&
        Number.isFinite(lunchStartIndex) &&
        lunchEndIndex !== null &&
        Number.isFinite(lunchEndIndex) &&
        lunchStartIndex >= shiftStartIndex &&
        lunchEndIndex >= lunchStartIndex
      ) {
        if (lunchStartIndex > shiftStartIndex) {
          segments.push({
            type: 'work',
            left: toPct(shiftStartIndex),
            width: widthPct(shiftStartIndex, lunchStartIndex - 1)
          })
        }
        segments.push({
          type: 'lunch',
          left: toPct(lunchStartIndex),
          width: widthPct(lunchStartIndex, lunchEndIndex)
        })
        if (lunchEndIndex < shiftEndIndex) {
          segments.push({
            type: 'work',
            left: toPct(lunchEndIndex + 1),
            width: widthPct(lunchEndIndex + 1, shiftEndIndex)
          })
        }
      } else {
        segments.push({
          type: 'work',
          left: toPct(shiftStartIndex),
          width: widthPct(shiftStartIndex, shiftEndIndex)
        })
      }

      return {
        rowId: agent.agentId ?? `Agent-${index + 1}`,
        agentId: agent.agentId ?? `A${String(index + 1).padStart(3, '0')}`,
        shiftStart: formatIntervalLabel(agent.shiftStart),
        shiftEnd: formatIntervalLabel(agent.shiftEnd),
        lunchStart: agent.lunchStart ? formatIntervalLabel(agent.lunchStart) : null,
        lunchEnd: agent.lunchEnd ? formatIntervalLabel(agent.lunchEnd) : null,
        segments
      }
    })
    .filter((row) => row !== null)
}

export const calculateFileProcessorTotalCalls = ({
  selectedMode,
  calculatedRows,
  parsedRows
}) => {
  if (selectedMode !== 'file-processor' && selectedMode !== 'daily-plan') return 0
  return calculatedRows.reduce((total, row) => {
    const source = parsedRows[row.rowIndex - 1] ?? {}
    const calls = Number(source.calls_offered)
    return total + (Number.isFinite(calls) ? calls : 0)
  }, 0)
}

export const buildTrendChart = ({ selectedMode, chartSeries, formatCount }) => {
  const data = chartSeries
  if (!data.length) return null

  const width = 980
  const height = 420
  const padding = { top: 36, right: 70, bottom: 74, left: 70 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const maxLine = Math.max(...data.map((point) => point.lineValue))
  const maxBar = Math.max(...data.map((point) => point.barValue))
  const lineAxisMax = niceCeiling(maxLine)
  const barAxisMax = niceCeiling(maxBar)
  const pointCount = data.length
  const isDailyStacked = selectedMode === 'daily-plan'

  const barSlotWidth = pointCount > 1 ? plotWidth / pointCount : plotWidth * 0.5
  const barWidth = Math.max(1, Math.min(barSlotWidth * 0.72, 30))
  const xAt = (index) =>
    padding.left + (pointCount === 1 ? plotWidth / 2 : barSlotWidth * (index + 0.5))

  const yForLine = (value) => padding.top + plotHeight - (value / lineAxisMax) * plotHeight
  const yForBar = (value) => padding.top + plotHeight - (value / barAxisMax) * plotHeight
  const staffZeroY = yForBar(0)

  const hoverWidth = pointCount > 1 ? barSlotWidth : plotWidth * 0.5
  const points = data.map((point, index) => {
    const x = xAt(index)
    const lineY = yForLine(point.lineValue)
    const barY = yForBar(point.barValue)

    if (isDailyStacked) {
      const requiredAgentsY = yForBar(point.requiredAgents)
      const requiredHeadcountY = yForBar(point.barValue)
      return {
        ...point,
        index,
        x,
        lineY,
        barX: x - barWidth / 2,
        barWidth,
        hoverX: x - hoverWidth / 2,
        hoverWidth,
        requiredAgentsY,
        requiredHeadcountY,
        requiredAgentsHeight: Math.max(0, staffZeroY - requiredAgentsY),
        headcountAddonHeight: Math.max(0, requiredAgentsY - requiredHeadcountY)
      }
    }

    return {
      ...point,
      index,
      x,
      lineY,
      barY,
      barX: x - barWidth / 2,
      barWidth,
      hoverX: x - hoverWidth / 2,
      hoverWidth,
      barHeight: Math.max(0, padding.top + plotHeight - barY)
    }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.lineY}`)
    .join(' ')

  const yTickCount = 4
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) => {
    const ratio = index / yTickCount
    const y = padding.top + ratio * plotHeight
    return {
      y,
      lineValue: formatCount(lineAxisMax * (1 - ratio)),
      barValue: formatCount(barAxisMax * (1 - ratio))
    }
  })

  const targetTicks = 8
  const xTickStep = Math.max(1, Math.ceil(pointCount / targetTicks))
  const xTickIndexes = []
  for (let index = 0; index < pointCount; index += xTickStep) {
    xTickIndexes.push(index)
  }
  if (xTickIndexes[xTickIndexes.length - 1] !== pointCount - 1) {
    xTickIndexes.push(pointCount - 1)
  }

  const xTicks = xTickIndexes.map((index) => ({
    x: points[index].x,
    label: points[index].label
  }))

  return {
    width,
    height,
    padding,
    points,
    yTicks,
    linePath,
    xTicks
  }
}

export const buildActiveChartTooltip = ({
  selectedMode,
  trendChart,
  activeChartPoint,
  formatCount
}) => {
  if (selectedMode !== 'daily-plan') return null
  if (!trendChart || !activeChartPoint) return null

  const point = activeChartPoint
  const chart = trendChart
  const tooltipWidth = 250
  const tooltipHeight = 106

  let tooltipX = point.x + 12
  if (tooltipX + tooltipWidth > chart.width - 8) {
    tooltipX = point.x - tooltipWidth - 12
  }
  let tooltipY = point.lineY - tooltipHeight - 12
  if (tooltipY < chart.padding.top + 4) {
    tooltipY = point.lineY + 12
  }

  return {
    x: tooltipX,
    y: tooltipY,
    width: tooltipWidth,
    height: tooltipHeight,
    label: point.label,
    callsOffered: formatCount(point.lineValue),
    requiredAgents: formatCount(point.requiredAgents ?? 0),
    headcountAddon: formatCount(point.headcountAddon ?? 0),
    requiredHeadcount: formatCount(point.barValue)
  }
}
