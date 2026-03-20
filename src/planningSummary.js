export const getCenterGroups = (center) => (Array.isArray(center?.groups) ? center.groups : [])
export const getGroupPlans = (group) => (Array.isArray(group?.plans) ? group.plans : [])

export const getAnnualContacts = (plan) => {
  const summary = plan.summary || {}
  if (typeof summary.annualContacts === 'number') {
    return summary.annualContacts
  }

  if (Array.isArray(plan.planMonths)) {
    return plan.planMonths.reduce((sum, month) => sum + (Number(month.contacts) || 0), 0)
  }

  return 0
}

export const getAnnualWorkloadHours = (plan) => {
  const summary = plan.summary || {}
  return summary.annualWorkloadHours || 0
}

export const getAnnualRequiredStaffHours = (plan) => {
  const summary = plan.summary || {}
  if (typeof summary.annualRequiredStaffHours === 'number') {
    return summary.annualRequiredStaffHours
  }

  return (summary.averageRequiredStaffHours || 0) * 12
}

export const getAverageAhtSeconds = (plan) => {
  const summary = plan.summary || {}
  if (typeof summary.averageAhtSeconds === 'number') {
    return summary.averageAhtSeconds
  }

  const annualContacts = getAnnualContacts(plan)
  const annualWorkloadHours = getAnnualWorkloadHours(plan)

  if (annualContacts > 0 && annualWorkloadHours > 0) {
    return (annualWorkloadHours * 3600) / annualContacts
  }

  if (Array.isArray(plan.planMonths)) {
    const populatedMonths = plan.planMonths.filter((month) => Number(month.ahtSeconds) > 0)
    if (populatedMonths.length) {
      return populatedMonths.reduce((sum, month) => sum + Number(month.ahtSeconds || 0), 0) / populatedMonths.length
    }
  }

  return 0
}

export const getMinRequiredHeadcount = (plan) => {
  const summary = plan.summary || {}
  if (typeof summary.minimumRequiredHeadcount === 'number') {
    return summary.minimumRequiredHeadcount
  }

  return summary.averageRequiredHeadcount || 0
}

export const getAverageRequiredHeadcount = (plan) => plan.summary?.averageRequiredHeadcount || 0
export const getPeakRequiredHeadcount = (plan) => plan.summary?.peakRequiredHeadcount || 0

export const summarizePlanList = (plans) => {
  if (!plans.length) {
    return {
      planCount: 0,
      annualContacts: 0,
      averageAhtSeconds: 0,
      annualWorkloadHours: 0,
      totalNeededStaffHours: 0,
      totalMinRequiredHeadcount: 0,
      totalAvgRequiredHeadcount: 0,
      totalPeakHeadcount: 0
    }
  }

  const annualContacts = plans.reduce((sum, plan) => sum + getAnnualContacts(plan), 0)
  const annualWorkloadHours = plans.reduce((sum, plan) => sum + getAnnualWorkloadHours(plan), 0)

  return {
    planCount: plans.length,
    annualContacts,
    averageAhtSeconds: annualContacts > 0 ? (annualWorkloadHours * 3600) / annualContacts : 0,
    annualWorkloadHours,
    totalNeededStaffHours: plans.reduce((sum, plan) => sum + getAnnualRequiredStaffHours(plan), 0),
    totalMinRequiredHeadcount: plans.reduce((sum, plan) => sum + getMinRequiredHeadcount(plan), 0),
    totalAvgRequiredHeadcount: plans.reduce((sum, plan) => sum + getAverageRequiredHeadcount(plan), 0),
    totalPeakHeadcount: plans.reduce((sum, plan) => sum + getPeakRequiredHeadcount(plan), 0)
  }
}

export const summarizeGroup = (group) => {
  const plans = getGroupPlans(group)

  return {
    ...summarizePlanList(plans),
    name: group?.name || 'Staffing Group'
  }
}

export const summarizeCenter = (center) => {
  const groups = getCenterGroups(center)
  const groupSummaries = groups.map((group) => summarizeGroup(group))
  const flattenedPlans = groups.flatMap((group) => getGroupPlans(group))
  const planSummary = summarizePlanList(flattenedPlans)

  return {
    ...planSummary,
    groupCount: groups.length,
    totalPlanCount: flattenedPlans.length,
    planCount: groups.length,
    name: center?.name || 'Call Center',
    timezone: center?.timezone || '',
    defaultPaidHoursPerDay: center?.defaultPaidHoursPerDay || 0,
    defaultOccupancyPercent: center?.defaultOccupancyPercent || 0,
    defaultAdherencePercent: center?.defaultAdherencePercent || 0,
    largestGroupPlanCount: groupSummaries.reduce((max, summary) => Math.max(max, summary.planCount), 0)
  }
}

export const summarizeCenterPortfolio = (centers) => {
  if (!centers.length) {
    return {
      callCenterCount: 0,
      totalGroupCount: 0,
      totalPlanCount: 0,
      annualContacts: 0,
      averageAhtSeconds: 0,
      annualWorkloadHours: 0,
      totalNeededStaffHours: 0,
      totalAvgRequiredHeadcount: 0,
      totalPeakHeadcount: 0
    }
  }

  const centerSummaries = centers.map((center) => summarizeCenter(center))
  const annualContacts = centerSummaries.reduce((sum, summary) => sum + summary.annualContacts, 0)
  const annualWorkloadHours = centerSummaries.reduce((sum, summary) => sum + summary.annualWorkloadHours, 0)

  return {
    callCenterCount: centers.length,
    totalGroupCount: centerSummaries.reduce((sum, summary) => sum + summary.groupCount, 0),
    totalPlanCount: centerSummaries.reduce((sum, summary) => sum + summary.totalPlanCount, 0),
    annualContacts,
    averageAhtSeconds: annualContacts > 0 ? (annualWorkloadHours * 3600) / annualContacts : 0,
    annualWorkloadHours,
    totalNeededStaffHours: centerSummaries.reduce((sum, summary) => sum + summary.totalNeededStaffHours, 0),
    totalAvgRequiredHeadcount: centerSummaries.reduce((sum, summary) => sum + summary.totalAvgRequiredHeadcount, 0),
    totalPeakHeadcount: centerSummaries.reduce((sum, summary) => sum + summary.totalPeakHeadcount, 0)
  }
}

export const summarizePlanPortfolio = (plans) => summarizePlanList(plans)
