import { DEMAND_SOURCE_FORECAST } from './demandSources'
import {
  PLAN_STATUS_DRAFT,
  PLAN_TYPE_UPDATE,
  normalizePlanStatus
} from '../planningStorage'

const buildPlanLabel = (plan = {}) => {
  const explicitName = String(plan.name || '').trim()
  const planningYear = Number(plan.planningYear) || 0
  const fallbackType = String(plan.planType || '').trim().toLowerCase() === PLAN_TYPE_UPDATE
    ? 'Update'
    : 'Budget'

  return explicitName || (planningYear ? `${planningYear} ${fallbackType}` : fallbackType)
}

export const findForecastPlanDependencies = (plans = [], forecastId = '') => {
  const normalizedForecastId = String(forecastId || '').trim()

  if (!normalizedForecastId) {
    return []
  }

  return (Array.isArray(plans) ? plans : [])
    .filter((plan) =>
      plan?.demandSource?.mode === DEMAND_SOURCE_FORECAST &&
      String(plan?.demandSource?.forecastProjectId || '').trim() === normalizedForecastId
    )
    .map((plan) => {
      const isDraft = normalizePlanStatus(plan.status, plan.planType) === PLAN_STATUS_DRAFT

      return {
        id: String(plan.id || '').trim(),
        label: buildPlanLabel(plan),
        state: isDraft ? 'draft' : 'finalized',
        isDraft
      }
    })
}

export const buildForecastPlanDependencyIndex = (plans = []) => {
  const forecastIds = [...new Set(
    (Array.isArray(plans) ? plans : [])
      .filter((plan) => plan?.demandSource?.mode === DEMAND_SOURCE_FORECAST)
      .map((plan) => String(plan?.demandSource?.forecastProjectId || '').trim())
      .filter(Boolean)
  )]

  return Object.fromEntries(
    forecastIds.map((forecastId) => [
      forecastId,
      findForecastPlanDependencies(plans, forecastId)
    ])
  )
}
