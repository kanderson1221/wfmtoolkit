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

export const summarizePlanPortfolio = (plans) => {
  if (!plans.length) {
    return {
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
    annualContacts,
    averageAhtSeconds: annualContacts > 0 ? (annualWorkloadHours * 3600) / annualContacts : 0,
    annualWorkloadHours,
    totalNeededStaffHours: plans.reduce((sum, plan) => sum + getAnnualRequiredStaffHours(plan), 0),
    totalMinRequiredHeadcount: plans.reduce((sum, plan) => sum + getMinRequiredHeadcount(plan), 0),
    totalAvgRequiredHeadcount: plans.reduce((sum, plan) => sum + getAverageRequiredHeadcount(plan), 0),
    totalPeakHeadcount: plans.reduce((sum, plan) => sum + getPeakRequiredHeadcount(plan), 0)
  }
}
