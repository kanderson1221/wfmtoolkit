export const getCenterGroups = (center) => (Array.isArray(center?.groups) ? center.groups : [])
export const getGroupPlans = (group) => (Array.isArray(group?.plans) ? group.plans : [])
export const getPlansForYear = (plans, planningYear) =>
  plans.filter((plan) => Number(plan?.planningYear) === Number(planningYear))

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

export const summarizeGroupForYear = (group, planningYear) => {
  const plans = getPlansForYear(getGroupPlans(group), planningYear)

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

export const summarizeCenterForYear = (center, planningYear) => {
  const groups = getCenterGroups(center)
  const groupSummaries = groups.map((group) => summarizeGroupForYear(group, planningYear))
  const flattenedPlans = groups.flatMap((group) => getPlansForYear(getGroupPlans(group), planningYear))
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
