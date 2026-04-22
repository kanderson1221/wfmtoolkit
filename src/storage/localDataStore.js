import { BrowserStorageError } from './browserStorage'
import { wfmDexie, WFM_LOCAL_DATA_SCHEMA_VERSION } from './wfmDexie'
import {
  CENTERS_STORAGE_KEY,
  LEGACY_PLANS_STORAGE_KEY,
  migrateLegacyPlansToCenters,
  normalizePlanningCenter,
  sortPlanningCenters
} from '../planningStorage'
import {
  FORECAST_PROJECTS_STORAGE_KEY,
  normalizeForecastProject,
  sortForecastProjects
} from '../forecastingStorage'
import { DRAFT_STORAGE_KEY } from '../plannerDraftStorage'

const DEFAULT_SCOPE = 'default'
const DEFAULT_APP_VERSION = import.meta.env.VITE_APP_VERSION || ''
const LEGACY_MIGRATION_VERSION = 1
const COMPACT_BACKUP_FORMAT = 'workspace_snapshot_v2'
const LEGACY_TABLE_BACKUP_FORMAT = 'table_dump_v1'
const STORAGE_META_SCHEMA_VERSION_KEY = 'schemaVersion'
const STORAGE_META_LEGACY_MIGRATION_VERSION_KEY = 'legacyLocalStorageMigrationVersion'
const STORAGE_META_LEGACY_MIGRATED_AT_KEY = 'legacyLocalStorageMigratedAt'
const STORAGE_META_LAST_BACKUP_EXPORT_AT_KEY = 'lastBackupExportAt'
export const LOCAL_DATA_CHANGED_EVENT = 'wfmtoolkit:local-data-changed'

const ALL_TABLE_NAMES = [
  'appMeta',
  'centers',
  'centerHolidayProfiles',
  'centerCustomHolidays',
  'staffingGroups',
  'plans',
  'planPresenceMonths',
  'planRandomMonths',
  'planDemandMonths',
  'planActualMonths',
  'planStaffingMonths',
  'planTrainingClasses',
  'plannerDrafts',
  'forecasts',
  'forecastCustomSeasonalities',
  'forecastCustomHolidays',
  'forecastHistoryRows',
  'forecastRuns',
  'forecastRunDailyRows',
  'forecastRunMonthlyRows',
  'forecastRunComponentRows'
]

const TOP_LEVEL_BACKUP_TABLES = new Set(ALL_TABLE_NAMES)
const clonePlain = (value) => JSON.parse(JSON.stringify(value))
const normalizeScope = (scope = DEFAULT_SCOPE) => String(scope || DEFAULT_SCOPE)
const nowIso = () => new Date().toISOString()
const scopedLocalStorageKey = (baseKey, scope = DEFAULT_SCOPE) =>
  `${baseKey}.${normalizeScope(scope)}`

const emitLocalDataChanged = () => {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(LOCAL_DATA_CHANGED_EVENT))
  }
}

const createStorageError = (message, cause, code = 'storage_write_failed', storageKey = '') =>
  new BrowserStorageError(message, {
    code,
    storageKey,
    cause
  })

const getLocalStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage || null
  } catch {
    return null
  }
}

const parseLocalStorageJson = (storage, key, fallback = null) => {
  if (!storage) {
    return fallback
  }

  try {
    const rawValue = storage.getItem(key)
    if (!rawValue) {
      return fallback
    }
    return JSON.parse(rawValue)
  } catch {
    return fallback
  }
}

const buildCenterHolidayProfileId = (centerId, year) => `${centerId}:holiday-profile:${year}`
const buildCenterHolidayRowId = (centerId, year, rowIndex) => `${centerId}:holiday:${year}:${rowIndex}`
const buildPlanRowId = (planId, kind, monthIndex) => `${planId}:${kind}:${monthIndex}`
const buildTrainingClassRowId = (planId, rowIndex) => `${planId}:training:${rowIndex}`
const buildForecastConfigRowId = (forecastId, kind, rowIndex) => `${forecastId}:${kind}:${rowIndex}`
const buildForecastRunId = (forecastId) => `${forecastId}:latest`
const buildForecastRunRowId = (runId, kind, rowIndex) => `${runId}:${kind}:${rowIndex}`
const buildForecastComponentRowId = (runId, componentType, rowIndex) => `${runId}:${componentType}:${rowIndex}`

const getScopeRows = async (table, scope) => table.where('scope').equals(scope).toArray()

const flattenPlanningWorkspace = (centers, scope = DEFAULT_SCOPE) => {
  const normalizedScope = normalizeScope(scope)
  const centerRows = []
  const centerHolidayProfileRows = []
  const centerCustomHolidayRows = []
  const staffingGroupRows = []
  const planRows = []
  const planPresenceMonthRows = []
  const planRandomMonthRows = []
  const planDemandMonthRows = []
  const planActualMonthRows = []
  const planStaffingMonthRows = []
  const planTrainingClassRows = []

  ;(Array.isArray(centers) ? centers : []).forEach((center) => {
    centerRows.push({
      scope: normalizedScope,
      id: center.id,
      name: center.name,
      timezone: center.timezone,
      operatingWeekdays: [...(center.operatingWeekdays || [])],
      operatingOpenTime: center.operatingOpenTime || '',
      operatingCloseTime: center.operatingCloseTime || '',
      defaultPaidHoursPerDay: center.defaultPaidHoursPerDay,
      defaultOccupancyPercent: center.defaultOccupancyPercent,
      defaultAdherencePercent: center.defaultAdherencePercent,
      createdAt: center.createdAt || nowIso(),
      updatedAt: center.updatedAt || nowIso()
    })

    ;(center.holidayProfiles || []).forEach((profile) => {
      const holidayProfileId = buildCenterHolidayProfileId(center.id, profile.year)
      centerHolidayProfileRows.push({
        scope: normalizedScope,
        id: holidayProfileId,
        centerId: center.id,
        year: Number(profile.year) || 0,
        holidayCalendarId: profile.holidayCalendarId || '',
        disabledHolidayRuleIds: [...(profile.disabledHolidayRuleIds || [])],
        createdAt: center.createdAt || nowIso(),
        updatedAt: center.updatedAt || nowIso()
      })

      ;(profile.customHolidays || []).forEach((holiday, rowIndex) => {
        centerCustomHolidayRows.push({
          scope: normalizedScope,
          id: buildCenterHolidayRowId(center.id, profile.year, rowIndex),
          centerId: center.id,
          holidayProfileId,
          year: Number(profile.year) || 0,
          rowIndex,
          label: holiday.label || '',
          date: holiday.date || ''
        })
      })
    })

    ;(center.groups || []).forEach((group) => {
      staffingGroupRows.push({
        scope: normalizedScope,
        id: group.id,
        centerId: center.id,
        name: group.name,
        operatingWeekdays: [...(group.operatingWeekdays || [])],
        defaultPaidHoursPerDay: group.defaultPaidHoursPerDay,
        defaultOccupancyPercent: group.defaultOccupancyPercent,
        defaultAdherencePercent: group.defaultAdherencePercent,
        serviceLevelPercent: group.serviceLevelPercent,
        serviceLevelThresholdSeconds: group.serviceLevelThresholdSeconds,
        holidayCalendarId: group.holidayCalendarId || '',
        holidayScheduleMode: group.holidayScheduleMode || '',
        actuals: clonePlain(group.actuals || {}),
        intraday: clonePlain(group.intraday || {}),
        createdAt: group.createdAt || nowIso(),
        updatedAt: group.updatedAt || nowIso()
      })

      ;(group.plans || []).forEach((plan) => {
        planRows.push({
          scope: normalizedScope,
          id: plan.id,
          centerId: center.id,
          groupId: group.id,
          name: plan.name,
          planningYear: plan.planningYear,
          operatingWeekdays: [...(plan.operatingWeekdays || [])],
          holidayCalendarId: plan.holidayCalendarId || '',
          disabledHolidayRuleIds: [...(plan.disabledHolidayRuleIds || [])],
          customHolidays: clonePlain(plan.customHolidays || []),
          holidayScheduleMode: plan.holidayScheduleMode || '',
          randomDefaults: clonePlain(plan.randomDefaults || {}),
          useMonthlyRandomOverrides: Boolean(plan.useMonthlyRandomOverrides),
          serviceLevelPercent: plan.serviceLevelPercent ?? null,
          serviceLevelThresholdSeconds: plan.serviceLevelThresholdSeconds ?? null,
          operatingOpenTime: plan.operatingOpenTime || '',
          operatingCloseTime: plan.operatingCloseTime || '',
          intraday: clonePlain(plan.intraday || {}),
          demandSource: clonePlain(plan.demandSource || {}),
          trainingSettings: clonePlain(plan.trainingSettings || {}),
          nextYearOpening: clonePlain(plan.nextYearOpening || {}),
          startingHeadcount: plan.startingHeadcount ?? 0,
          startingFrontlineHeadcount: plan.startingFrontlineHeadcount ?? 0,
          createdAt: plan.createdAt || nowIso(),
          updatedAt: plan.updatedAt || nowIso()
        })

        ;(plan.presenceMonths || []).forEach((month, monthIndex) => {
          planPresenceMonthRows.push({
            scope: normalizedScope,
            id: buildPlanRowId(plan.id, 'presence', monthIndex),
            planId: plan.id,
            monthIndex,
            ...clonePlain(month)
          })
        })
        ;(plan.randomMonths || []).forEach((month, monthIndex) => {
          planRandomMonthRows.push({
            scope: normalizedScope,
            id: buildPlanRowId(plan.id, 'random', monthIndex),
            planId: plan.id,
            monthIndex,
            ...clonePlain(month)
          })
        })
        ;(plan.planMonths || []).forEach((month, monthIndex) => {
          planDemandMonthRows.push({
            scope: normalizedScope,
            id: buildPlanRowId(plan.id, 'demand', monthIndex),
            planId: plan.id,
            monthIndex,
            ...clonePlain(month)
          })
        })
        ;(plan.actualsMonths || []).forEach((month, monthIndex) => {
          planActualMonthRows.push({
            scope: normalizedScope,
            id: buildPlanRowId(plan.id, 'actuals', monthIndex),
            planId: plan.id,
            monthIndex,
            ...clonePlain(month)
          })
        })
        ;(plan.staffingMonths || []).forEach((month, monthIndex) => {
          planStaffingMonthRows.push({
            scope: normalizedScope,
            id: buildPlanRowId(plan.id, 'staffing', monthIndex),
            planId: plan.id,
            monthIndex,
            ...clonePlain(month)
          })
        })
        ;(plan.trainingClasses || []).forEach((trainingClass, rowIndex) => {
          planTrainingClassRows.push({
            scope: normalizedScope,
            id: buildTrainingClassRowId(plan.id, rowIndex),
            planId: plan.id,
            rowIndex,
            ...clonePlain(trainingClass)
          })
        })
      })
    })
  })

  return {
    centerRows,
    centerHolidayProfileRows,
    centerCustomHolidayRows,
    staffingGroupRows,
    planRows,
    planPresenceMonthRows,
    planRandomMonthRows,
    planDemandMonthRows,
    planActualMonthRows,
    planStaffingMonthRows,
    planTrainingClassRows
  }
}

const hydratePlanningWorkspace = (scope, rows) => {
  const holidayRowsByProfileId = new Map()
  rows.centerCustomHolidayRows.forEach((row) => {
    const existingRows = holidayRowsByProfileId.get(row.holidayProfileId) || []
    holidayRowsByProfileId.set(row.holidayProfileId, [...existingRows, row])
  })

  const holidayProfilesByCenterId = new Map()
  rows.centerHolidayProfileRows.forEach((row) => {
    const holidays = (holidayRowsByProfileId.get(row.id) || [])
      .sort((left, right) => left.rowIndex - right.rowIndex)
      .map((holidayRow) => ({
        label: holidayRow.label,
        date: holidayRow.date
      }))
    const existingProfiles = holidayProfilesByCenterId.get(row.centerId) || []
    holidayProfilesByCenterId.set(row.centerId, [
      ...existingProfiles,
      {
        year: row.year,
        holidayCalendarId: row.holidayCalendarId,
        disabledHolidayRuleIds: [...(row.disabledHolidayRuleIds || [])],
        customHolidays: holidays
      }
    ])
  })

  const monthRowsByPlanId = (monthRows) => {
    const rowsByPlanId = new Map()
    monthRows.forEach((row) => {
      const existingRows = rowsByPlanId.get(row.planId) || []
      rowsByPlanId.set(row.planId, [...existingRows, row])
    })
    return rowsByPlanId
  }

  const presenceByPlanId = monthRowsByPlanId(rows.planPresenceMonthRows)
  const randomByPlanId = monthRowsByPlanId(rows.planRandomMonthRows)
  const demandByPlanId = monthRowsByPlanId(rows.planDemandMonthRows)
  const actualsByPlanId = monthRowsByPlanId(rows.planActualMonthRows)
  const staffingByPlanId = monthRowsByPlanId(rows.planStaffingMonthRows)
  const trainingByPlanId = monthRowsByPlanId(rows.planTrainingClassRows)

  const plansByGroupId = new Map()
  rows.planRows.forEach((row) => {
    const existingPlans = plansByGroupId.get(row.groupId) || []
    plansByGroupId.set(row.groupId, [
      ...existingPlans,
      {
        id: row.id,
        name: row.name,
        planningYear: row.planningYear,
        operatingWeekdays: [...(row.operatingWeekdays || [])],
        holidayCalendarId: row.holidayCalendarId,
        disabledHolidayRuleIds: [...(row.disabledHolidayRuleIds || [])],
        customHolidays: clonePlain(row.customHolidays || []),
        holidayScheduleMode: row.holidayScheduleMode,
        randomDefaults: clonePlain(row.randomDefaults || {}),
        useMonthlyRandomOverrides: Boolean(row.useMonthlyRandomOverrides),
        serviceLevelPercent: row.serviceLevelPercent,
        serviceLevelThresholdSeconds: row.serviceLevelThresholdSeconds,
        operatingOpenTime: row.operatingOpenTime,
        operatingCloseTime: row.operatingCloseTime,
        intraday: clonePlain(row.intraday || {}),
        demandSource: clonePlain(row.demandSource || {}),
        trainingSettings: clonePlain(row.trainingSettings || {}),
        nextYearOpening: clonePlain(row.nextYearOpening || {}),
        startingHeadcount: row.startingHeadcount,
        startingFrontlineHeadcount: row.startingFrontlineHeadcount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        presenceMonths: (presenceByPlanId.get(row.id) || [])
          .sort((left, right) => left.monthIndex - right.monthIndex)
          .map(({ id: _id, scope: _scope, planId: _planId, monthIndex: _monthIndex, ...month }) => month),
        randomMonths: (randomByPlanId.get(row.id) || [])
          .sort((left, right) => left.monthIndex - right.monthIndex)
          .map(({ id: _id, scope: _scope, planId: _planId, monthIndex: _monthIndex, ...month }) => month),
        planMonths: (demandByPlanId.get(row.id) || [])
          .sort((left, right) => left.monthIndex - right.monthIndex)
          .map(({ id: _id, scope: _scope, planId: _planId, monthIndex: _monthIndex, ...month }) => month),
        actualsMonths: (actualsByPlanId.get(row.id) || [])
          .sort((left, right) => left.monthIndex - right.monthIndex)
          .map(({ id: _id, scope: _scope, planId: _planId, monthIndex: _monthIndex, ...month }) => month),
        staffingMonths: (staffingByPlanId.get(row.id) || [])
          .sort((left, right) => left.monthIndex - right.monthIndex)
          .map(({ id: _id, scope: _scope, planId: _planId, monthIndex: _monthIndex, ...month }) => month),
        trainingClasses: (trainingByPlanId.get(row.id) || [])
          .sort((left, right) => left.rowIndex - right.rowIndex)
          .map(({ id: _id, scope: _scope, planId: _planId, rowIndex: _rowIndex, ...trainingClass }) => trainingClass)
      }
    ])
  })

  const groupsByCenterId = new Map()
  rows.staffingGroupRows.forEach((row) => {
    const existingGroups = groupsByCenterId.get(row.centerId) || []
    groupsByCenterId.set(row.centerId, [
      ...existingGroups,
      {
        id: row.id,
        name: row.name,
        operatingWeekdays: [...(row.operatingWeekdays || [])],
        defaultPaidHoursPerDay: row.defaultPaidHoursPerDay,
        defaultOccupancyPercent: row.defaultOccupancyPercent,
        defaultAdherencePercent: row.defaultAdherencePercent,
        serviceLevelPercent: row.serviceLevelPercent,
        serviceLevelThresholdSeconds: row.serviceLevelThresholdSeconds,
        holidayCalendarId: row.holidayCalendarId,
        holidayScheduleMode: row.holidayScheduleMode,
        actuals: clonePlain(row.actuals || {}),
        intraday: clonePlain(row.intraday || {}),
        actualsYears: clonePlain(row.actualsYears || []),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        plans: clonePlain(plansByGroupId.get(row.id) || [])
      }
    ])
  })

  return sortPlanningCenters(
    rows.centerRows.map((row) =>
      normalizePlanningCenter(
        {
          id: row.id,
          name: row.name,
          timezone: row.timezone,
          operatingWeekdays: [...(row.operatingWeekdays || [])],
          operatingOpenTime: row.operatingOpenTime,
          operatingCloseTime: row.operatingCloseTime,
          defaultPaidHoursPerDay: row.defaultPaidHoursPerDay,
          defaultOccupancyPercent: row.defaultOccupancyPercent,
          defaultAdherencePercent: row.defaultAdherencePercent,
          holidayProfiles: clonePlain(holidayProfilesByCenterId.get(row.id) || []),
          groups: clonePlain(groupsByCenterId.get(row.id) || []),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        },
        row.updatedAt || row.createdAt || nowIso()
      )
    )
  )
}

const flattenForecastWorkspace = (projects, scope = DEFAULT_SCOPE) => {
  const normalizedScope = normalizeScope(scope)
  const forecastRows = []
  const customSeasonalityRows = []
  const customHolidayRows = []
  const historyRows = []
  const forecastRunRows = []
  const forecastRunDailyRows = []
  const forecastRunMonthlyRows = []
  const forecastRunComponentRows = []

  ;(Array.isArray(projects) ? projects : []).forEach((project) => {
    const customSeasonalities = project.modelConfig?.customSeasonalities || []
    const customHolidays = project.modelConfig?.customHolidays || []
    const { customSeasonalities: _customSeasonalities, customHolidays: _customHolidays, ...modelConfig } =
      clonePlain(project.modelConfig || {})

    forecastRows.push({
      scope: normalizedScope,
      id: project.id,
      name: project.name,
      sourceKind: project.sourceKind || '',
      centerId: project.centerId || project.planningContext?.centerId || '',
      centerName: project.centerName || '',
      groupId: project.groupId || project.planningContext?.groupId || '',
      planningYear: project.planningYear ?? project.planningContext?.planningYear ?? null,
      forecastType: project.forecastType || '',
      coverageStartMonthIndex: project.coverageStartMonthIndex ?? null,
      coverageStartDate: project.coverageStartDate || '',
      coverageEndDate: project.coverageEndDate || '',
      planningReady: Boolean(project.planningReady),
      sourceCenterSnapshot: clonePlain(project.sourceCenterSnapshot || {}),
      sourceCenterHolidayProfiles: clonePlain(project.sourceCenterHolidayProfiles || []),
      centerManagedHolidays: Boolean(project.centerManagedHolidays),
      seriesLabel: project.seriesLabel || '',
      timezone: project.timezone || '',
      forecastHorizonDays: project.forecastHorizonDays,
      forecastHorizonPreset: project.forecastHorizonPreset || '',
      uploadedFileName: project.uploadedFileName || '',
      uploadedHeaders: [...(project.uploadedHeaders || [])],
      manualAdjustments: clonePlain(project.manualAdjustments || []),
      parserIssues: [...(project.parserIssues || [])],
      normalizationIssues: [...(project.normalizationIssues || [])],
      sourceData: clonePlain(project.sourceData || {}),
      columnMapping: clonePlain(project.columnMapping || {}),
      modelConfig,
      planningContext: clonePlain(project.planningContext || {}),
      createdAt: project.createdAt || nowIso(),
      updatedAt: project.updatedAt || nowIso()
    })

    customSeasonalities.forEach((seasonality, rowIndex) => {
      customSeasonalityRows.push({
        scope: normalizedScope,
        id: buildForecastConfigRowId(project.id, 'seasonality', rowIndex),
        forecastId: project.id,
        rowIndex,
        ...clonePlain(seasonality)
      })
    })

    customHolidays.forEach((holiday, rowIndex) => {
      customHolidayRows.push({
        scope: normalizedScope,
        id: buildForecastConfigRowId(project.id, 'holiday', rowIndex),
        forecastId: project.id,
        rowIndex,
        ...clonePlain(holiday)
      })
    })

    ;(project.historyRows || []).forEach((row, rowIndex) => {
      historyRows.push({
        scope: normalizedScope,
        id: buildForecastConfigRowId(project.id, 'history', rowIndex),
        forecastId: project.id,
        rowIndex,
        historyKind: 'volume',
        ...clonePlain(row)
      })
    })

    ;(project.ahtHistoryRows || []).forEach((row, rowIndex) => {
      historyRows.push({
        scope: normalizedScope,
        id: buildForecastConfigRowId(project.id, 'aht-history', rowIndex),
        forecastId: project.id,
        rowIndex,
        historyKind: 'aht',
        ...clonePlain(row)
      })
    })

    if (project.lastRun?.runAt) {
      const runId = buildForecastRunId(project.id)
      forecastRunRows.push({
        scope: normalizedScope,
        id: runId,
        runId,
        forecastId: project.id,
        runAt: project.lastRun.runAt,
        inputSignature: project.lastRun.inputSignature || '',
        summary: clonePlain(project.lastRun.summary || null),
        diagnostics: clonePlain(project.lastRun.diagnostics || {}),
        createdAt: project.lastRun.runAt || nowIso(),
        updatedAt: project.lastRun.runAt || nowIso()
      })

      ;(project.lastRun.dailyForecast || []).forEach((row, rowIndex) => {
        forecastRunDailyRows.push({
          scope: normalizedScope,
          id: buildForecastRunRowId(runId, 'daily', rowIndex),
          forecastId: project.id,
          runId,
          rowIndex,
          ...clonePlain(row)
        })
      })

      ;(project.lastRun.monthlyRollup || []).forEach((row, rowIndex) => {
        forecastRunMonthlyRows.push({
          scope: normalizedScope,
          id: buildForecastRunRowId(runId, 'monthly', rowIndex),
          forecastId: project.id,
          runId,
          rowIndex,
          ...clonePlain(row)
        })
      })

      ;(['trend', 'yearly', 'monthly', 'weekly', 'holidays']).forEach((componentType) => {
        ;(project.lastRun.components?.[componentType] || []).forEach((row, rowIndex) => {
          forecastRunComponentRows.push({
            scope: normalizedScope,
            id: buildForecastComponentRowId(runId, componentType, rowIndex),
            forecastId: project.id,
            runId,
            componentType,
            rowIndex,
            ...clonePlain(row)
          })
        })
      })
    }
  })

  return {
    forecastRows,
    customSeasonalityRows,
    customHolidayRows,
    historyRows,
    forecastRunRows,
    forecastRunDailyRows,
    forecastRunMonthlyRows,
    forecastRunComponentRows
  }
}

const hydrateForecastWorkspace = (scope, rows) => {
  const seasonalityByForecastId = new Map()
  rows.customSeasonalityRows.forEach((row) => {
    const existingRows = seasonalityByForecastId.get(row.forecastId) || []
    seasonalityByForecastId.set(row.forecastId, [...existingRows, row])
  })

  const holidayByForecastId = new Map()
  rows.customHolidayRows.forEach((row) => {
    const existingRows = holidayByForecastId.get(row.forecastId) || []
    holidayByForecastId.set(row.forecastId, [...existingRows, row])
  })

  const historyByForecastId = new Map()
  rows.historyRows.forEach((row) => {
    const existingRows = historyByForecastId.get(row.forecastId) || []
    historyByForecastId.set(row.forecastId, [...existingRows, row])
  })

  const dailyByRunId = new Map()
  rows.forecastRunDailyRows.forEach((row) => {
    const existingRows = dailyByRunId.get(row.runId) || []
    dailyByRunId.set(row.runId, [...existingRows, row])
  })

  const monthlyByRunId = new Map()
  rows.forecastRunMonthlyRows.forEach((row) => {
    const existingRows = monthlyByRunId.get(row.runId) || []
    monthlyByRunId.set(row.runId, [...existingRows, row])
  })

  const componentsByRunId = new Map()
  rows.forecastRunComponentRows.forEach((row) => {
    const existingRows = componentsByRunId.get(row.runId) || []
    componentsByRunId.set(row.runId, [...existingRows, row])
  })

  const runByForecastId = new Map()
  rows.forecastRunRows.forEach((row) => {
    runByForecastId.set(row.forecastId, row)
  })

  return sortForecastProjects(
    rows.forecastRows.map((row) => {
      const runRecord = runByForecastId.get(row.id)
      const runId = runRecord?.runId
      const runComponents = runId ? componentsByRunId.get(runId) || [] : []

      return normalizeForecastProject(
        {
          id: row.id,
          name: row.name,
          sourceKind: row.sourceKind || '',
          centerId: row.centerId,
          centerName: row.centerName,
          groupId: row.groupId,
          planningYear: row.planningYear,
          forecastType: row.forecastType,
          coverageStartMonthIndex: row.coverageStartMonthIndex,
          coverageStartDate: row.coverageStartDate,
          coverageEndDate: row.coverageEndDate,
          planningReady: Boolean(row.planningReady),
          sourceCenterSnapshot: clonePlain(row.sourceCenterSnapshot || {}),
          sourceCenterHolidayProfiles: clonePlain(row.sourceCenterHolidayProfiles || []),
          centerManagedHolidays: Boolean(row.centerManagedHolidays),
          seriesLabel: row.seriesLabel,
          timezone: row.timezone,
          forecastHorizonDays: row.forecastHorizonDays,
          forecastHorizonPreset: row.forecastHorizonPreset,
          uploadedFileName: row.uploadedFileName,
          uploadedHeaders: [...(row.uploadedHeaders || [])],
          manualAdjustments: clonePlain(row.manualAdjustments || []),
          parserIssues: [...(row.parserIssues || [])],
          normalizationIssues: [...(row.normalizationIssues || [])],
          sourceData: clonePlain(row.sourceData || {}),
          columnMapping: clonePlain(row.columnMapping || {}),
          modelConfig: {
            ...clonePlain(row.modelConfig || {}),
            customSeasonalities: (seasonalityByForecastId.get(row.id) || [])
              .sort((left, right) => left.rowIndex - right.rowIndex)
              .map(({ id: _id, scope: _scope, forecastId: _forecastId, rowIndex: _rowIndex, ...seasonality }) => seasonality),
            customHolidays: (holidayByForecastId.get(row.id) || [])
              .sort((left, right) => left.rowIndex - right.rowIndex)
              .map(({ id: _id, scope: _scope, forecastId: _forecastId, rowIndex: _rowIndex, ...holiday }) => holiday)
          },
          historyRows: (historyByForecastId.get(row.id) || [])
            .filter((historyRow) => historyRow.historyKind !== 'aht')
            .sort((left, right) => left.rowIndex - right.rowIndex)
            .map(({
              id: _id,
              scope: _scope,
              forecastId: _forecastId,
              rowIndex: _rowIndex,
              historyKind: _historyKind,
              ...historyRow
            }) => historyRow),
          ahtHistoryRows: (historyByForecastId.get(row.id) || [])
            .filter((historyRow) => historyRow.historyKind === 'aht')
            .sort((left, right) => left.rowIndex - right.rowIndex)
            .map(({
              id: _id,
              scope: _scope,
              forecastId: _forecastId,
              rowIndex: _rowIndex,
              historyKind: _historyKind,
              ...historyRow
            }) => historyRow),
          planningContext: clonePlain(row.planningContext || {}),
          lastRun: runRecord
            ? {
                runAt: runRecord.runAt,
                inputSignature: runRecord.inputSignature || '',
                summary: clonePlain(runRecord.summary || null),
                diagnostics: clonePlain(runRecord.diagnostics || {}),
                dailyForecast: (dailyByRunId.get(runId) || [])
                  .sort((left, right) => left.rowIndex - right.rowIndex)
                  .map(({ id: _id, scope: _scope, forecastId: _forecastId, runId: _runId, rowIndex: _rowIndex, ...dailyRow }) => dailyRow),
                monthlyRollup: (monthlyByRunId.get(runId) || [])
                  .sort((left, right) => left.rowIndex - right.rowIndex)
                  .map(({ id: _id, scope: _scope, forecastId: _forecastId, runId: _runId, rowIndex: _rowIndex, ...monthlyRow }) => monthlyRow),
                components: {
                  trend: runComponents
                    .filter((componentRow) => componentRow.componentType === 'trend')
                    .sort((left, right) => left.rowIndex - right.rowIndex)
                    .map(({ id: _id, scope: _scope, forecastId: _forecastId, runId: _runId, componentType: _componentType, rowIndex: _rowIndex, ...componentRow }) => componentRow),
                  yearly: runComponents
                    .filter((componentRow) => componentRow.componentType === 'yearly')
                    .sort((left, right) => left.rowIndex - right.rowIndex)
                    .map(({ id: _id, scope: _scope, forecastId: _forecastId, runId: _runId, componentType: _componentType, rowIndex: _rowIndex, ...componentRow }) => componentRow),
                  monthly: runComponents
                    .filter((componentRow) => componentRow.componentType === 'monthly')
                    .sort((left, right) => left.rowIndex - right.rowIndex)
                    .map(({ id: _id, scope: _scope, forecastId: _forecastId, runId: _runId, componentType: _componentType, rowIndex: _rowIndex, ...componentRow }) => componentRow),
                  weekly: runComponents
                    .filter((componentRow) => componentRow.componentType === 'weekly')
                    .sort((left, right) => left.rowIndex - right.rowIndex)
                    .map(({ id: _id, scope: _scope, forecastId: _forecastId, runId: _runId, componentType: _componentType, rowIndex: _rowIndex, ...componentRow }) => componentRow),
                  holidays: runComponents
                    .filter((componentRow) => componentRow.componentType === 'holidays')
                    .sort((left, right) => left.rowIndex - right.rowIndex)
                    .map(({ id: _id, scope: _scope, forecastId: _forecastId, runId: _runId, componentType: _componentType, rowIndex: _rowIndex, ...componentRow }) => componentRow)
                }
              }
            : {},
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        },
        row.updatedAt || row.createdAt || nowIso()
      )
    })
  )
}

const writePlanningWorkspaceRows = async (centers, scope = DEFAULT_SCOPE) => {
  const normalizedScope = normalizeScope(scope)
  const flattened = flattenPlanningWorkspace(centers, normalizedScope)

  await Promise.all([
    wfmDexie.centerCustomHolidays.where('scope').equals(normalizedScope).delete(),
    wfmDexie.centerHolidayProfiles.where('scope').equals(normalizedScope).delete(),
    wfmDexie.planPresenceMonths.where('scope').equals(normalizedScope).delete(),
    wfmDexie.planRandomMonths.where('scope').equals(normalizedScope).delete(),
    wfmDexie.planDemandMonths.where('scope').equals(normalizedScope).delete(),
    wfmDexie.planActualMonths.where('scope').equals(normalizedScope).delete(),
    wfmDexie.planStaffingMonths.where('scope').equals(normalizedScope).delete(),
    wfmDexie.planTrainingClasses.where('scope').equals(normalizedScope).delete(),
    wfmDexie.plans.where('scope').equals(normalizedScope).delete(),
    wfmDexie.staffingGroups.where('scope').equals(normalizedScope).delete(),
    wfmDexie.centers.where('scope').equals(normalizedScope).delete()
  ])

  await Promise.all([
    flattened.centerRows.length ? wfmDexie.centers.bulkPut(flattened.centerRows) : Promise.resolve(),
    flattened.centerHolidayProfileRows.length ? wfmDexie.centerHolidayProfiles.bulkPut(flattened.centerHolidayProfileRows) : Promise.resolve(),
    flattened.centerCustomHolidayRows.length ? wfmDexie.centerCustomHolidays.bulkPut(flattened.centerCustomHolidayRows) : Promise.resolve(),
    flattened.staffingGroupRows.length ? wfmDexie.staffingGroups.bulkPut(flattened.staffingGroupRows) : Promise.resolve(),
    flattened.planRows.length ? wfmDexie.plans.bulkPut(flattened.planRows) : Promise.resolve(),
    flattened.planPresenceMonthRows.length ? wfmDexie.planPresenceMonths.bulkPut(flattened.planPresenceMonthRows) : Promise.resolve(),
    flattened.planRandomMonthRows.length ? wfmDexie.planRandomMonths.bulkPut(flattened.planRandomMonthRows) : Promise.resolve(),
    flattened.planDemandMonthRows.length ? wfmDexie.planDemandMonths.bulkPut(flattened.planDemandMonthRows) : Promise.resolve(),
    flattened.planActualMonthRows.length ? wfmDexie.planActualMonths.bulkPut(flattened.planActualMonthRows) : Promise.resolve(),
    flattened.planStaffingMonthRows.length ? wfmDexie.planStaffingMonths.bulkPut(flattened.planStaffingMonthRows) : Promise.resolve(),
    flattened.planTrainingClassRows.length ? wfmDexie.planTrainingClasses.bulkPut(flattened.planTrainingClassRows) : Promise.resolve()
  ])
}

const writeForecastWorkspaceRows = async (projects, scope = DEFAULT_SCOPE) => {
  const normalizedScope = normalizeScope(scope)
  const flattened = flattenForecastWorkspace(projects, normalizedScope)

  await Promise.all([
    wfmDexie.forecastRunComponentRows.where('scope').equals(normalizedScope).delete(),
    wfmDexie.forecastRunMonthlyRows.where('scope').equals(normalizedScope).delete(),
    wfmDexie.forecastRunDailyRows.where('scope').equals(normalizedScope).delete(),
    wfmDexie.forecastRuns.where('scope').equals(normalizedScope).delete(),
    wfmDexie.forecastHistoryRows.where('scope').equals(normalizedScope).delete(),
    wfmDexie.forecastCustomHolidays.where('scope').equals(normalizedScope).delete(),
    wfmDexie.forecastCustomSeasonalities.where('scope').equals(normalizedScope).delete(),
    wfmDexie.forecasts.where('scope').equals(normalizedScope).delete()
  ])

  await Promise.all([
    flattened.forecastRows.length ? wfmDexie.forecasts.bulkPut(flattened.forecastRows) : Promise.resolve(),
    flattened.customSeasonalityRows.length ? wfmDexie.forecastCustomSeasonalities.bulkPut(flattened.customSeasonalityRows) : Promise.resolve(),
    flattened.customHolidayRows.length ? wfmDexie.forecastCustomHolidays.bulkPut(flattened.customHolidayRows) : Promise.resolve(),
    flattened.historyRows.length ? wfmDexie.forecastHistoryRows.bulkPut(flattened.historyRows) : Promise.resolve(),
    flattened.forecastRunRows.length ? wfmDexie.forecastRuns.bulkPut(flattened.forecastRunRows) : Promise.resolve(),
    flattened.forecastRunDailyRows.length ? wfmDexie.forecastRunDailyRows.bulkPut(flattened.forecastRunDailyRows) : Promise.resolve(),
    flattened.forecastRunMonthlyRows.length ? wfmDexie.forecastRunMonthlyRows.bulkPut(flattened.forecastRunMonthlyRows) : Promise.resolve(),
    flattened.forecastRunComponentRows.length ? wfmDexie.forecastRunComponentRows.bulkPut(flattened.forecastRunComponentRows) : Promise.resolve()
  ])
}

const readMetaRecord = async (key) => {
  const record = await wfmDexie.appMeta.get(key)
  return record?.value
}

const writeMetaRecord = async (key, value) => {
  await wfmDexie.appMeta.put({
    key,
    value,
    updatedAt: nowIso()
  })
}

const collectCompactBackupData = async () => {
  const [centerRows, forecastRows, draftRows, legacyMigratedAt, lastBackupExportAt] = await Promise.all([
    wfmDexie.centers.toArray(),
    wfmDexie.forecasts.toArray(),
    wfmDexie.plannerDrafts.toArray(),
    readMetaRecord(STORAGE_META_LEGACY_MIGRATED_AT_KEY),
    readMetaRecord(STORAGE_META_LAST_BACKUP_EXPORT_AT_KEY)
  ])

  const workspaceScopes = [...new Set([
    ...centerRows.map((row) => normalizeScope(row.scope)),
    ...forecastRows.map((row) => normalizeScope(row.scope))
  ])].sort()

  const workspaces = []
  for (const scope of workspaceScopes) {
    const [planningCenters, forecasts] = await Promise.all([
      loadPlanningWorkspaceFromDexie(scope),
      loadForecastWorkspaceFromDexie(scope)
    ])

    if (!planningCenters.length && !forecasts.length) {
      continue
    }

    workspaces.push({
      scope,
      planningCenters,
      forecasts
    })
  }

  return {
    workspaces,
    plannerDrafts: draftRows.map((row) => ({
      scope: normalizeScope(row.scope),
      draftKey: String(row.draftKey || 'new'),
      createdAt: row.createdAt || '',
      updatedAt: row.updatedAt || '',
      autosavedAt: row.autosavedAt || '',
      value: clonePlain(row.value || {})
    })),
    meta: {
      legacyLocalStorageMigratedAt: String(legacyMigratedAt || ''),
      lastBackupExportAt: String(lastBackupExportAt || '')
    }
  }
}

const collectCompactBackupCounts = (data) => {
  const workspaces = Array.isArray(data.workspaces) ? data.workspaces : []
  const drafts = Array.isArray(data.plannerDrafts) ? data.plannerDrafts : []
  const centers = workspaces.flatMap((workspace) => workspace.planningCenters || [])
  const staffingGroups = centers.flatMap((center) => center.groups || [])
  const plans = staffingGroups.flatMap((group) => group.plans || [])
  const forecasts = workspaces.flatMap((workspace) => workspace.forecasts || [])

  return {
    centers,
    staffingGroups,
    plans,
    forecasts,
    drafts
  }
}

const latestDefinedDate = (values = []) =>
  values
    .filter(Boolean)
    .sort()
    .at(-1) || ''

const validateBackupEnvelope = (envelope) => {
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Backup file is not a valid WFM Toolkit backup.')
  }

  if (!Number.isInteger(Number(envelope.schemaVersion))) {
    throw new Error('Backup file is missing a valid schema version.')
  }

  if (!envelope.data || typeof envelope.data !== 'object') {
    throw new Error('Backup file is missing table data.')
  }

  if (Array.isArray(envelope.data.workspaces)) {
    envelope.data.workspaces.forEach((workspace, index) => {
      if (!workspace || typeof workspace !== 'object') {
        throw new Error(`Backup file workspace ${index + 1} is invalid.`)
      }

      if (!Array.isArray(workspace.planningCenters)) {
        throw new Error(`Backup file workspace ${index + 1} is missing planning centers.`)
      }

      if (!Array.isArray(workspace.forecasts)) {
        throw new Error(`Backup file workspace ${index + 1} is missing forecasts.`)
      }
    })

    if (envelope.data.plannerDrafts && !Array.isArray(envelope.data.plannerDrafts)) {
      throw new Error('Backup file planner drafts are invalid.')
    }

    return {
      format: COMPACT_BACKUP_FORMAT,
      schemaVersion: Number(envelope.schemaVersion),
      exportedAt: String(envelope.exportedAt || ''),
      appVersion: String(envelope.appVersion || ''),
      data: {
        workspaces: clonePlain(envelope.data.workspaces),
        plannerDrafts: clonePlain(envelope.data.plannerDrafts || []),
        meta: clonePlain(envelope.data.meta || {})
      }
    }
  }

  for (const tableName of TOP_LEVEL_BACKUP_TABLES) {
    if (!Array.isArray(envelope.data[tableName])) {
      throw new Error(`Backup file is missing the ${tableName} table.`)
    }
  }

  return {
    format: LEGACY_TABLE_BACKUP_FORMAT,
    schemaVersion: Number(envelope.schemaVersion),
    exportedAt: String(envelope.exportedAt || ''),
    appVersion: String(envelope.appVersion || ''),
    data: clonePlain(envelope.data)
  }
}

const summarizeBackupEnvelope = (validatedEnvelope) => {
  const { data } = validatedEnvelope

  if (validatedEnvelope.format === COMPACT_BACKUP_FORMAT) {
    const { centers, staffingGroups, plans, forecasts, drafts } = collectCompactBackupCounts(data)

    return {
      callCenterCount: centers.length,
      staffingGroupCount: staffingGroups.length,
      annualPlanCount: plans.length,
      savedForecastCount: forecasts.length,
      plannerDraftCount: drafts.length,
      planningUpdatedAt: latestDefinedDate([
        ...centers.map((center) => center.updatedAt || center.createdAt || ''),
        ...staffingGroups.map((group) => group.updatedAt || group.createdAt || ''),
        ...plans.map((plan) => plan.updatedAt || plan.createdAt || '')
      ]),
      forecastUpdatedAt: latestDefinedDate([
        ...forecasts.map((forecast) => forecast.updatedAt || forecast.createdAt || ''),
        ...forecasts.map((forecast) => forecast.lastRun?.runAt || '')
      ]),
      draftUpdatedAt: latestDefinedDate(
        drafts.map((draft) => draft.autosavedAt || draft.updatedAt || draft.createdAt || '')
      )
    }
  }

  const latestUpdatedAt = (...tableNames) =>
    tableNames
      .flatMap((tableName) => data[tableName] || [])
      .map((row) => row.updatedAt || row.autosavedAt || row.runAt || '')
      .filter(Boolean)
      .sort()
      .at(-1) || ''

  return {
    callCenterCount: data.centers.length,
    staffingGroupCount: data.staffingGroups.length,
    annualPlanCount: data.plans.length,
    savedForecastCount: data.forecasts.length,
    plannerDraftCount: data.plannerDrafts.length,
    planningUpdatedAt: latestUpdatedAt('centers', 'staffingGroups', 'plans'),
    forecastUpdatedAt: latestUpdatedAt('forecasts', 'forecastRuns'),
    draftUpdatedAt: latestUpdatedAt('plannerDrafts')
  }
}

const migrateLegacyPlanningData = (storage) => {
  const migratedScopes = new Map()
  const scopedKeys = []

  for (let index = 0; index < (storage?.length || 0); index += 1) {
    const key = storage.key(index)
    if (key === CENTERS_STORAGE_KEY || key?.startsWith(`${CENTERS_STORAGE_KEY}.`)) {
      scopedKeys.push(key)
    }
  }

  scopedKeys.forEach((key) => {
    const scope = key === CENTERS_STORAGE_KEY
      ? DEFAULT_SCOPE
      : key.slice(`${CENTERS_STORAGE_KEY}.`.length) || DEFAULT_SCOPE
    const parsedCenters = parseLocalStorageJson(storage, key, [])
    if (!Array.isArray(parsedCenters)) {
      return
    }

    migratedScopes.set(
      scope,
      sortPlanningCenters(
        parsedCenters.map((center) =>
          normalizePlanningCenter(center, center.updatedAt || center.createdAt || nowIso())
        )
      )
    )
  })

  if (!migratedScopes.size) {
    const legacyPlans = parseLocalStorageJson(storage, LEGACY_PLANS_STORAGE_KEY, [])
    const migratedCenters = migrateLegacyPlansToCenters(legacyPlans)
    if (migratedCenters.length) {
      migratedScopes.set(DEFAULT_SCOPE, migratedCenters)
    }
  }

  return migratedScopes
}

const migrateLegacyForecastData = (storage) => {
  const migratedScopes = new Map()

  for (let index = 0; index < (storage?.length || 0); index += 1) {
    const key = storage.key(index)
    if (!(key === FORECAST_PROJECTS_STORAGE_KEY || key?.startsWith(`${FORECAST_PROJECTS_STORAGE_KEY}.`))) {
      continue
    }

    const scope = key === FORECAST_PROJECTS_STORAGE_KEY
      ? DEFAULT_SCOPE
      : key.slice(`${FORECAST_PROJECTS_STORAGE_KEY}.`.length) || DEFAULT_SCOPE
    const parsedProjects = parseLocalStorageJson(storage, key, [])
    if (!Array.isArray(parsedProjects)) {
      continue
    }

    migratedScopes.set(
      scope,
      sortForecastProjects(
        parsedProjects.map((project) =>
          normalizeForecastProject(project, project.updatedAt || project.createdAt || nowIso(), parsedProjects)
        )
      )
    )
  }

  return migratedScopes
}

const migrateLegacyDraftData = (storage) => {
  const draftMap = parseLocalStorageJson(storage, DRAFT_STORAGE_KEY, {})
  if (!draftMap || typeof draftMap !== 'object') {
    return []
  }

  return Object.entries(draftMap)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([draftKey, draftValue]) => ({
      scope: DEFAULT_SCOPE,
      draftKey: String(draftKey || 'new'),
      createdAt: draftValue.createdAt || draftValue.autosavedAt || nowIso(),
      updatedAt: draftValue.autosavedAt || nowIso(),
      autosavedAt: draftValue.autosavedAt || nowIso(),
      value: clonePlain(draftValue)
    }))
}

export const ensureLocalDataReady = async () => {
  try {
    await wfmDexie.open()
    await writeMetaRecord(STORAGE_META_SCHEMA_VERSION_KEY, WFM_LOCAL_DATA_SCHEMA_VERSION)
  } catch (error) {
    throw createStorageError('Unable to access browser data storage.', error, 'storage_unavailable')
  }
}

export const ensureLegacyLocalStorageMigrated = async () => {
  await ensureLocalDataReady()

  const migratedVersion = Number(await readMetaRecord(STORAGE_META_LEGACY_MIGRATION_VERSION_KEY) || 0)
  if (migratedVersion >= LEGACY_MIGRATION_VERSION) {
    return {
      migrated: Boolean(await readMetaRecord(STORAGE_META_LEGACY_MIGRATED_AT_KEY)),
      schemaVersion: WFM_LOCAL_DATA_SCHEMA_VERSION
    }
  }

  const storage = getLocalStorage()
  const planningByScope = migrateLegacyPlanningData(storage)
  const forecastByScope = migrateLegacyForecastData(storage)
  const draftRows = migrateLegacyDraftData(storage)
  const hasLegacyData = planningByScope.size > 0 || forecastByScope.size > 0 || draftRows.length > 0

  try {
    await wfmDexie.transaction('rw', ...wfmDexie.tables, async () => {
      for (const [scope, centers] of planningByScope.entries()) {
        await writePlanningWorkspaceRows(centers, scope)
      }

      for (const [scope, projects] of forecastByScope.entries()) {
        await writeForecastWorkspaceRows(projects, scope)
      }

      if (draftRows.length) {
        await wfmDexie.plannerDrafts.bulkPut(draftRows)
      }

      await writeMetaRecord(STORAGE_META_LEGACY_MIGRATION_VERSION_KEY, LEGACY_MIGRATION_VERSION)
      if (hasLegacyData) {
        await writeMetaRecord(STORAGE_META_LEGACY_MIGRATED_AT_KEY, nowIso())
      }
    })
  } catch (error) {
    throw createStorageError('Unable to migrate legacy local data.', error)
  }

  emitLocalDataChanged()

  return {
    migrated: hasLegacyData,
    schemaVersion: WFM_LOCAL_DATA_SCHEMA_VERSION
  }
}

export const loadPlanningWorkspaceFromDexie = async (scope = DEFAULT_SCOPE) => {
  const normalizedScope = normalizeScope(scope)

  try {
    await ensureLocalDataReady()
    const [
      centerRows,
      centerHolidayProfileRows,
      centerCustomHolidayRows,
      staffingGroupRows,
      planRows,
      planPresenceMonthRows,
      planRandomMonthRows,
      planDemandMonthRows,
      planActualMonthRows,
      planStaffingMonthRows,
      planTrainingClassRows
    ] = await Promise.all([
      getScopeRows(wfmDexie.centers, normalizedScope),
      getScopeRows(wfmDexie.centerHolidayProfiles, normalizedScope),
      getScopeRows(wfmDexie.centerCustomHolidays, normalizedScope),
      getScopeRows(wfmDexie.staffingGroups, normalizedScope),
      getScopeRows(wfmDexie.plans, normalizedScope),
      getScopeRows(wfmDexie.planPresenceMonths, normalizedScope),
      getScopeRows(wfmDexie.planRandomMonths, normalizedScope),
      getScopeRows(wfmDexie.planDemandMonths, normalizedScope),
      getScopeRows(wfmDexie.planActualMonths, normalizedScope),
      getScopeRows(wfmDexie.planStaffingMonths, normalizedScope),
      getScopeRows(wfmDexie.planTrainingClasses, normalizedScope)
    ])

    return hydratePlanningWorkspace(normalizedScope, {
      centerRows,
      centerHolidayProfileRows,
      centerCustomHolidayRows,
      staffingGroupRows,
      planRows,
      planPresenceMonthRows,
      planRandomMonthRows,
      planDemandMonthRows,
      planActualMonthRows,
      planStaffingMonthRows,
      planTrainingClassRows
    })
  } catch (error) {
    throw createStorageError('Unable to read planning data from this browser.', error, 'storage_write_failed')
  }
}

export const persistPlanningWorkspaceToDexie = async (centers, scope = DEFAULT_SCOPE) => {
  const normalizedScope = normalizeScope(scope)
  const normalizedCenters = sortPlanningCenters(
    (Array.isArray(centers) ? centers : []).map((center) =>
      normalizePlanningCenter(center, center.updatedAt || center.createdAt || nowIso())
    )
  )

  try {
    await ensureLocalDataReady()
    await wfmDexie.transaction(
      'rw',
      wfmDexie.centers,
      wfmDexie.centerHolidayProfiles,
      wfmDexie.centerCustomHolidays,
      wfmDexie.staffingGroups,
      wfmDexie.plans,
      wfmDexie.planPresenceMonths,
      wfmDexie.planRandomMonths,
      wfmDexie.planDemandMonths,
      wfmDexie.planActualMonths,
      wfmDexie.planStaffingMonths,
      wfmDexie.planTrainingClasses,
      async () => {
        await writePlanningWorkspaceRows(normalizedCenters, normalizedScope)
      }
    )
    emitLocalDataChanged()
    return normalizedCenters
  } catch (error) {
    throw createStorageError('Unable to save planning data in this browser.', error)
  }
}

export const loadForecastWorkspaceFromDexie = async (scope = DEFAULT_SCOPE) => {
  const normalizedScope = normalizeScope(scope)

  try {
    await ensureLocalDataReady()
    const [
      forecastRows,
      customSeasonalityRows,
      customHolidayRows,
      historyRows,
      forecastRunRows,
      forecastRunDailyRows,
      forecastRunMonthlyRows,
      forecastRunComponentRows
    ] = await Promise.all([
      getScopeRows(wfmDexie.forecasts, normalizedScope),
      getScopeRows(wfmDexie.forecastCustomSeasonalities, normalizedScope),
      getScopeRows(wfmDexie.forecastCustomHolidays, normalizedScope),
      getScopeRows(wfmDexie.forecastHistoryRows, normalizedScope),
      getScopeRows(wfmDexie.forecastRuns, normalizedScope),
      getScopeRows(wfmDexie.forecastRunDailyRows, normalizedScope),
      getScopeRows(wfmDexie.forecastRunMonthlyRows, normalizedScope),
      getScopeRows(wfmDexie.forecastRunComponentRows, normalizedScope)
    ])

    return hydrateForecastWorkspace(normalizedScope, {
      forecastRows,
      customSeasonalityRows,
      customHolidayRows,
      historyRows,
      forecastRunRows,
      forecastRunDailyRows,
      forecastRunMonthlyRows,
      forecastRunComponentRows
    })
  } catch (error) {
    throw createStorageError('Unable to read saved forecasts from this browser.', error, 'storage_write_failed')
  }
}

export const persistForecastWorkspaceToDexie = async (projects, scope = DEFAULT_SCOPE) => {
  const normalizedScope = normalizeScope(scope)
  const normalizedProjects = sortForecastProjects(
    (Array.isArray(projects) ? projects : []).map((project) =>
      normalizeForecastProject(project, project.updatedAt || project.createdAt || nowIso(), projects)
    )
  )

  try {
    await ensureLocalDataReady()
    await wfmDexie.transaction(
      'rw',
      wfmDexie.forecasts,
      wfmDexie.forecastCustomSeasonalities,
      wfmDexie.forecastCustomHolidays,
      wfmDexie.forecastHistoryRows,
      wfmDexie.forecastRuns,
      wfmDexie.forecastRunDailyRows,
      wfmDexie.forecastRunMonthlyRows,
      wfmDexie.forecastRunComponentRows,
      async () => {
        await writeForecastWorkspaceRows(normalizedProjects, normalizedScope)
      }
    )
    emitLocalDataChanged()
    return normalizedProjects
  } catch (error) {
    throw createStorageError('Unable to save forecasts in this browser.', error)
  }
}

export const loadPlannerDraftFromDexie = async (draftKey, scope = DEFAULT_SCOPE) => {
  const normalizedDraftKey = String(draftKey ?? '').trim()

  if (!normalizedDraftKey) {
    return null
  }

  try {
    await ensureLocalDataReady()
    const record = await wfmDexie.plannerDrafts.get([normalizeScope(scope), normalizedDraftKey])
    return record?.value ? clonePlain(record.value) : null
  } catch (error) {
    throw createStorageError('Unable to read the saved planner draft.', error, 'storage_write_failed')
  }
}

export const persistPlannerDraftToDexie = async (draftKey, draftValue, scope = DEFAULT_SCOPE) => {
  const normalizedDraftKey = String(draftKey ?? '').trim()
  const timestamp = nowIso()
  const nextDraft = {
    ...clonePlain(draftValue),
    autosavedAt: timestamp
  }

  if (!normalizedDraftKey) {
    return nextDraft
  }

  try {
    await ensureLocalDataReady()
    await wfmDexie.plannerDrafts.put({
      scope: normalizeScope(scope),
      draftKey: normalizedDraftKey,
      value: nextDraft,
      autosavedAt: nextDraft.autosavedAt,
      createdAt: nextDraft.createdAt || timestamp,
      updatedAt: timestamp
    })
    emitLocalDataChanged()
    return nextDraft
  } catch (error) {
    throw createStorageError('Unable to save the planner draft in this browser.', error)
  }
}

export const clearPlannerDraftFromDexie = async (draftKey, scope = DEFAULT_SCOPE) => {
  const normalizedDraftKey = String(draftKey ?? '').trim()

  if (!normalizedDraftKey) {
    return
  }

  try {
    await ensureLocalDataReady()
    await wfmDexie.plannerDrafts.delete([normalizeScope(scope), normalizedDraftKey])
    emitLocalDataChanged()
  } catch (error) {
    throw createStorageError('Unable to clear the saved planner draft.', error, 'storage_remove_failed')
  }
}

export const getLocalDataStorageSummary = async () => {
  try {
    await ensureLocalDataReady()
    const [
      centers,
      staffingGroups,
      plans,
      forecasts,
      plannerDrafts,
      legacyMigratedAt,
      lastBackupExportAt
    ] = await Promise.all([
      wfmDexie.centers.toArray(),
      wfmDexie.staffingGroups.toArray(),
      wfmDexie.plans.toArray(),
      wfmDexie.forecasts.toArray(),
      wfmDexie.plannerDrafts.toArray(),
      readMetaRecord(STORAGE_META_LEGACY_MIGRATED_AT_KEY),
      readMetaRecord(STORAGE_META_LAST_BACKUP_EXPORT_AT_KEY)
    ])

    const latestDate = (rows, field = 'updatedAt') =>
      rows
        .map((row) => row[field] || '')
        .filter(Boolean)
        .sort()
        .at(-1) || ''

    return {
      storageLocationLabel: 'Stored in this browser',
      migrationStatusLabel: legacyMigratedAt ? 'Migrated from previous local storage' : 'Using Dexie local database',
      callCenterCount: centers.length,
      staffingGroupCount: staffingGroups.length,
      annualPlanCount: plans.length,
      savedForecastCount: forecasts.length,
      plannerDraftCount: plannerDrafts.length,
      planningUpdatedAt: latestDate([...centers, ...staffingGroups, ...plans]),
      forecastUpdatedAt: latestDate(forecasts),
      draftUpdatedAt: latestDate(plannerDrafts, 'autosavedAt'),
      lastBackupExportAt: String(lastBackupExportAt || ''),
      schemaVersion: WFM_LOCAL_DATA_SCHEMA_VERSION
    }
  } catch (error) {
    throw createStorageError('Unable to inspect local data storage.', error, 'storage_write_failed')
  }
}

export const exportLocalDataBackup = async () => {
  try {
    await ensureLocalDataReady()
    const exportedAt = nowIso()
    await writeMetaRecord(STORAGE_META_LAST_BACKUP_EXPORT_AT_KEY, exportedAt)
    const data = await collectCompactBackupData()
    emitLocalDataChanged()

    return {
      backupFormat: COMPACT_BACKUP_FORMAT,
      schemaVersion: WFM_LOCAL_DATA_SCHEMA_VERSION,
      exportedAt,
      appVersion: DEFAULT_APP_VERSION,
      data
    }
  } catch (error) {
    throw createStorageError('Unable to export local data storage.', error, 'storage_write_failed')
  }
}

export const analyzeLocalDataBackup = (envelope) => summarizeBackupEnvelope(validateBackupEnvelope(envelope))

export const importLocalDataBackup = async (envelope) => {
  const validatedEnvelope = validateBackupEnvelope(envelope)

  try {
    await ensureLocalDataReady()
    await wfmDexie.transaction('rw', ...wfmDexie.tables, async () => {
      for (const tableName of ALL_TABLE_NAMES) {
        await wfmDexie.table(tableName).clear()
      }

      if (validatedEnvelope.format === COMPACT_BACKUP_FORMAT) {
        for (const workspace of validatedEnvelope.data.workspaces) {
          const scope = normalizeScope(workspace.scope)
          await writePlanningWorkspaceRows(workspace.planningCenters || [], scope)
          await writeForecastWorkspaceRows(workspace.forecasts || [], scope)
        }

        const draftRows = (validatedEnvelope.data.plannerDrafts || []).map((draftRow) => ({
          scope: normalizeScope(draftRow.scope),
          draftKey: String(draftRow.draftKey || 'new'),
          value: clonePlain(draftRow.value || {}),
          autosavedAt: draftRow.autosavedAt || draftRow.updatedAt || draftRow.createdAt || nowIso(),
          createdAt: draftRow.createdAt || draftRow.updatedAt || draftRow.autosavedAt || nowIso(),
          updatedAt: draftRow.updatedAt || draftRow.autosavedAt || draftRow.createdAt || nowIso()
        }))

        if (draftRows.length) {
          await wfmDexie.plannerDrafts.bulkPut(draftRows)
        }
      } else {
        for (const tableName of ALL_TABLE_NAMES) {
          const rows = validatedEnvelope.data[tableName]
          if (Array.isArray(rows) && rows.length) {
            await wfmDexie.table(tableName).bulkPut(rows)
          }
        }
      }

      await writeMetaRecord(STORAGE_META_SCHEMA_VERSION_KEY, WFM_LOCAL_DATA_SCHEMA_VERSION)
      await writeMetaRecord(STORAGE_META_LEGACY_MIGRATION_VERSION_KEY, LEGACY_MIGRATION_VERSION)

      const importedLegacyMigratedAt =
        validatedEnvelope.format === COMPACT_BACKUP_FORMAT
          ? String(validatedEnvelope.data.meta?.legacyLocalStorageMigratedAt || '')
          : ''
      if (importedLegacyMigratedAt) {
        await writeMetaRecord(STORAGE_META_LEGACY_MIGRATED_AT_KEY, importedLegacyMigratedAt)
      }

      const lastBackupExportAt =
        validatedEnvelope.format === COMPACT_BACKUP_FORMAT
          ? String(validatedEnvelope.data.meta?.lastBackupExportAt || validatedEnvelope.exportedAt || '')
          : String(validatedEnvelope.exportedAt || '')
      if (lastBackupExportAt) {
        await writeMetaRecord(STORAGE_META_LAST_BACKUP_EXPORT_AT_KEY, lastBackupExportAt)
      }
    })

    emitLocalDataChanged()
    return summarizeBackupEnvelope(validatedEnvelope)
  } catch (error) {
    throw createStorageError('Unable to import the local backup into this browser.', error, 'storage_write_failed')
  }
}

export const clearLocalDataStore = async () => {
  await ensureLocalDataReady()
  await wfmDexie.transaction('rw', ...wfmDexie.tables, async () => {
    for (const tableName of ALL_TABLE_NAMES) {
      await wfmDexie.table(tableName).clear()
    }
  })
  emitLocalDataChanged()
}

export const downloadLocalDataBackup = async () => {
  const backupEnvelope = await exportLocalDataBackup()
  return JSON.stringify(backupEnvelope)
}
