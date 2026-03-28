import {
  createNextYearOpening,
  createTrainingClass,
  createTrainingSettings,
  getCurrentCalendarYear,
  resolvePlanningYear,
  toNumber
} from './shared'
import { deriveTrainingClassMetrics } from './staffingModel'

const formatDateInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const sortPlansByFreshness = (plans) =>
  [...plans].sort((left, right) => {
    const leftStamp = new Date(left?.updatedAt || left?.createdAt || 0).getTime()
    const rightStamp = new Date(right?.updatedAt || right?.createdAt || 0).getTime()
    return rightStamp - leftStamp
  })

const stripTrainingClassOutcomes = (trainingClass) => {
  const {
    graduationDate: _graduationDate,
    frontlineReadyDate: _frontlineReadyDate,
    graduatingHeadcount: _graduatingHeadcount,
    projectedGraduatingHeadcount: _projectedGraduatingHeadcount,
    trainingFalloutHeadcount: _trainingFalloutHeadcount,
    ...baseTrainingClass
  } = createTrainingClass(trainingClass)

  return createTrainingClass(baseTrainingClass)
}

const isFiniteHeadcount = (value) => value !== '' && value != null && Number.isFinite(Number(value))

export const getPlanYear = (plan, fallback = getCurrentCalendarYear()) =>
  resolvePlanningYear(plan?.planningYear, fallback)

export const findLinkedPriorPlan = (plans, planOrContext) => {
  const currentPlanId = planOrContext?.id || null
  const targetYear = getPlanYear(planOrContext) - 1

  return sortPlansByFreshness(
    (Array.isArray(plans) ? plans : []).filter(
      (plan) => plan?.id !== currentPlanId && getPlanYear(plan) === targetYear
    )
  )[0] || null
}

export const findLinkedNextPlan = (plans, planOrContext) => {
  const currentPlanId = planOrContext?.id || null
  const targetYear = getPlanYear(planOrContext) + 1

  return sortPlansByFreshness(
    (Array.isArray(plans) ? plans : []).filter(
      (plan) => plan?.id !== currentPlanId && getPlanYear(plan) === targetYear
    )
  )[0] || null
}

export const resolveLinkedOpeningPosition = ({
  priorPlan,
  startingHeadcount,
  startingFrontlineHeadcount
}) => {
  const localRosterHeadcount = Math.max(toNumber(startingHeadcount, 0), 0)
  const localFrontlineHeadcount = Math.min(
    Math.max(toNumber(startingFrontlineHeadcount, localRosterHeadcount), 0),
    localRosterHeadcount
  )

  if (!priorPlan) {
    return {
      rosterHeadcount: localRosterHeadcount,
      frontlineHeadcount: localFrontlineHeadcount,
      isInherited: false,
      usesExplicitHandoff: false
    }
  }

  const explicitOpening = createNextYearOpening(priorPlan.nextYearOpening || {})
  const summary = priorPlan.summary || {}
  const rosterHeadcount =
    explicitOpening.rosterHeadcount ?? Math.max(toNumber(summary.endingRosterHeadcount, localRosterHeadcount), 0)
  const unresolvedFrontlineHeadcount =
    explicitOpening.frontlineHeadcount ?? Math.max(toNumber(summary.endingFrontlineHeadcount, localFrontlineHeadcount), 0)

  return {
    rosterHeadcount,
    frontlineHeadcount: Math.min(unresolvedFrontlineHeadcount, rosterHeadcount),
    isInherited: true,
    usesExplicitHandoff: explicitOpening.rosterHeadcount != null || explicitOpening.frontlineHeadcount != null
  }
}

export const buildInheritedTrainingClasses = ({ priorPlan, planningYear }) => {
  if (!priorPlan) {
    return []
  }

  const planStartDate = new Date(getPlanYear({ planningYear }), 0, 1)
  const normalizedSettings = createTrainingSettings(priorPlan.trainingSettings || {})

  return (Array.isArray(priorPlan.trainingClasses) ? priorPlan.trainingClasses : []).flatMap((trainingClass, index) => {
    const normalizedTrainingClass = createTrainingClass(trainingClass)
    const metrics = deriveTrainingClassMetrics(normalizedTrainingClass, normalizedSettings)

    if (!metrics.isValid || metrics.hireDate >= planStartDate || metrics.frontlineReadyDate < planStartDate) {
      return []
    }

    return [
      {
        ...normalizedTrainingClass,
        id: `inherited-${priorPlan.id || getPlanYear(priorPlan)}-${normalizedTrainingClass.id || index + 1}`,
        source: 'inherited',
        inheritedFromPlanId: priorPlan.id || '',
        inheritedFromPlanningYear: getPlanYear(priorPlan),
        graduationDate: formatDateInput(metrics.graduationDate),
        frontlineReadyDate: formatDateInput(metrics.frontlineReadyDate),
        graduatingHeadcount: metrics.graduatingHeadcount,
        projectedGraduatingHeadcount: metrics.projectedGraduatingHeadcount,
        trainingFalloutHeadcount: metrics.trainingFalloutHeadcount
      }
    ]
  })
}

export const shouldPersistCrossYearTrainingClass = (trainingClass, planningYear, trainingSettings) => {
  const normalizedPlanningYear = getPlanYear({ planningYear })
  const metrics = deriveTrainingClassMetrics(stripTrainingClassOutcomes(trainingClass), trainingSettings)

  return (
    metrics.isValid &&
    metrics.hireDate.getFullYear() === normalizedPlanningYear &&
    metrics.frontlineReadyDate.getFullYear() > normalizedPlanningYear
  )
}

export const persistTrainingClassOutcomes = (trainingClass, planningYear, trainingSettings) => {
  const baseTrainingClass = stripTrainingClassOutcomes(trainingClass)
  const metrics = deriveTrainingClassMetrics(baseTrainingClass, trainingSettings)

  if (!shouldPersistCrossYearTrainingClass(baseTrainingClass, planningYear, trainingSettings)) {
    return baseTrainingClass
  }

  return {
    ...baseTrainingClass,
    graduationDate: formatDateInput(metrics.graduationDate),
    frontlineReadyDate: formatDateInput(metrics.frontlineReadyDate),
    graduatingHeadcount: isFiniteHeadcount(trainingClass?.graduatingHeadcount)
      ? Number(trainingClass.graduatingHeadcount)
      : metrics.graduatingHeadcount,
    projectedGraduatingHeadcount: isFiniteHeadcount(trainingClass?.projectedGraduatingHeadcount)
      ? Number(trainingClass.projectedGraduatingHeadcount)
      : metrics.projectedGraduatingHeadcount,
    trainingFalloutHeadcount: isFiniteHeadcount(trainingClass?.trainingFalloutHeadcount)
      ? Number(trainingClass.trainingFalloutHeadcount)
      : metrics.trainingFalloutHeadcount
  }
}

export const buildHandoffPlanSnapshot = ({
  plan,
  planningYear,
  trainingSettings,
  trainingClasses,
  nextYearOpening,
  summary
}) => ({
  ...plan,
  planningYear: getPlanYear({ planningYear: planningYear ?? plan?.planningYear }),
  trainingSettings: createTrainingSettings(trainingSettings || plan?.trainingSettings || {}),
  trainingClasses: (Array.isArray(trainingClasses) ? trainingClasses : []).map((trainingClass) =>
    createTrainingClass(trainingClass)
  ),
  nextYearOpening: createNextYearOpening(nextYearOpening || plan?.nextYearOpening || {}),
  summary: {
    ...(plan?.summary || {}),
    ...(summary || {})
  }
})
