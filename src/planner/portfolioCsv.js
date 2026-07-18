import { buildCsv, formatCsvNumber } from '../csvExport'

const formatNumber = (value) => formatCsvNumber(value, 6)

const portfolioMonthlyColumns = [
  { header: 'planning_year', value: (_row, context) => context.planningYear },
  { header: 'plan_role', value: (_row, context) => context.planRole },
  { header: 'month_start', value: (row) => row.monthStart || '' },
  { header: 'month', value: (row) => row.monthLabel || row.label || '' },
  { header: 'groups_planned', value: (row) => formatCsvNumber(row.groupsPlannedCount, 0) },
  { header: 'groups_total', value: (_row, context) => formatCsvNumber(context.groupCount, 0) },
  { header: 'groups_with_actuals', value: (row) => formatCsvNumber(row.groupsWithActualsCount, 0) },
  { header: 'planned_contacts', value: (row) => formatNumber(row.expectedContacts) },
  { header: 'actual_contacts', value: (row) => formatNumber(row.actualContacts) },
  { header: 'contact_variance', value: (row) => formatNumber(row.contactVariance) },
  { header: 'planned_aht_seconds', value: (row) => formatNumber(row.expectedAhtSeconds) },
  { header: 'actual_aht_seconds', value: (row) => formatNumber(row.actualAhtSeconds) },
  { header: 'planned_workload_hours', value: (row) => formatNumber(row.expectedWorkloadHours) },
  { header: 'actual_workload_hours', value: (row) => formatNumber(row.actualWorkloadHours) },
  { header: 'required_staff_hours', value: (row) => formatNumber(row.requiredStaffHours) },
  { header: 'required_headcount', value: (row) => formatNumber(row.requiredHeadcount) },
  { header: 'peak_required_headcount', value: (row) => formatNumber(row.peakRequiredHeadcount) },
  { header: 'actual_required_headcount', value: (row) => formatNumber(row.actualRequiredHeadcount) },
  { header: 'actual_minus_planned_required_headcount', value: (row) => formatNumber(row.requiredHeadcountVariance) },
  { header: 'starting_frontline_headcount', value: (row) => formatNumber(row.startingFrontlineHeadcount) },
  { header: 'hire_headcount', value: (row) => formatNumber(row.hireHeadcount) },
  { header: 'frontline_ready_headcount', value: (row) => formatNumber(row.frontlineReadyHeadcount) },
  { header: 'frontline_attrition_headcount', value: (row) => formatNumber(row.frontlineAttritionHeadcount) },
  { header: 'ending_frontline_headcount', value: (row) => formatNumber(row.endingFrontlineHeadcount) },
  { header: 'ending_roster_headcount', value: (row) => formatNumber(row.endingRosterHeadcount) },
  { header: 'ending_frontline_minus_required_headcount', value: (row) => formatNumber(row.gapToRequirement) },
  { header: 'starting_frontline_minus_actual_required_headcount', value: (row) => formatNumber(row.gapVsActualRequiredHeadcount) },
  { header: 'below_requirement', value: (row) => row.isBelowRequirement ? 'yes' : 'no' },
  { header: 'actual_loaded_days', value: (row) => formatCsvNumber(row.daysLoaded, 0) }
]

export const buildPortfolioMonthlyCsv = ({
  planningYear,
  planRole = 'current',
  groupCount = 0,
  monthlyRows = []
} = {}) => {
  const context = {
    planningYear: formatCsvNumber(planningYear, 0),
    planRole: String(planRole || 'current'),
    groupCount
  }
  const columns = portfolioMonthlyColumns.map((column) => ({
    header: column.header,
    value: (row) => column.value(row, context)
  }))

  return buildCsv(columns, Array.isArray(monthlyRows) ? monthlyRows : [])
}
