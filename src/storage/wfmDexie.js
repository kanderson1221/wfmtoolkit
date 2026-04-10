import Dexie from 'dexie'

export const WFM_LOCAL_DATA_SCHEMA_VERSION = 2
export const WFM_LOCAL_DATA_DB_NAME = 'wfmtoolkit-local-data'

class WfmToolkitDexie extends Dexie {
  constructor() {
    super(WFM_LOCAL_DATA_DB_NAME)

    this.version(WFM_LOCAL_DATA_SCHEMA_VERSION).stores({
      appMeta: '&key',
      centers: '&[scope+id], scope, [scope+updatedAt], [scope+id]',
      centerHolidayProfiles: '&[scope+id], scope, [scope+centerId], [scope+centerId+year]',
      centerCustomHolidays: '&[scope+id], scope, [scope+centerId], [scope+centerId+year], [scope+holidayProfileId]',
      staffingGroups: '&[scope+id], scope, [scope+centerId], [scope+centerId+id], [scope+updatedAt]',
      plans: '&[scope+id], scope, [scope+centerId], [scope+groupId], [scope+centerId+groupId], [scope+centerId+groupId+planningYear], [scope+updatedAt]',
      planPresenceMonths: '&[scope+id], scope, [scope+planId], [scope+planId+monthIndex]',
      planRandomMonths: '&[scope+id], scope, [scope+planId], [scope+planId+monthIndex]',
      planDemandMonths: '&[scope+id], scope, [scope+planId], [scope+planId+monthIndex]',
      planActualMonths: '&[scope+id], scope, [scope+planId], [scope+planId+monthIndex]',
      planStaffingMonths: '&[scope+id], scope, [scope+planId], [scope+planId+monthIndex]',
      planTrainingClasses: '&[scope+id], scope, [scope+planId], [scope+planId+rowIndex]',
      plannerDrafts: '&[scope+draftKey], scope, [scope+updatedAt]',
      forecasts: '&[scope+id], scope, [scope+centerId], [scope+groupId], [scope+groupId+planningYear], [scope+groupId+forecastType], [scope+planningReady], [scope+updatedAt]',
      forecastCustomSeasonalities: '&[scope+id], scope, [scope+forecastId], [scope+forecastId+rowIndex]',
      forecastCustomHolidays: '&[scope+id], scope, [scope+forecastId], [scope+forecastId+rowIndex]',
      forecastHistoryRows: '&[scope+id], scope, [scope+forecastId], [scope+forecastId+rowIndex]',
      forecastRuns: '&[scope+id], scope, [scope+forecastId], [scope+runId], [scope+updatedAt]',
      forecastRunDailyRows: '&[scope+id], scope, [scope+forecastId], [scope+runId], [scope+runId+rowIndex]',
      forecastRunMonthlyRows: '&[scope+id], scope, [scope+forecastId], [scope+runId], [scope+runId+rowIndex]',
      forecastRunComponentRows: '&[scope+id], scope, [scope+forecastId], [scope+runId], [scope+runId+componentType], [scope+runId+rowIndex]'
    })
  }
}

export const wfmDexie = new WfmToolkitDexie()
