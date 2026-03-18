export const BASE_REQUIRED_HEADERS = [
  'queue_id',
  'interval_start',
  'calls_offered',
  'aht_seconds'
]

export const EXTENDED_REQUIRED_HEADERS = [
  'mean_patience_seconds',
  'service_level_threshold',
  'service_level_target_seconds',
  'max_occupancy'
]

export const WORKFLOWS = [
  {
    id: 'file-processor',
    label: 'File Processor',
    summary:
      'Upload a CSV of interval demand and return an enriched file with required agents, required headcount, and core service metrics for every row.',
    endpoint: '/api/erlang-c/batch/file-processor',
    templateHref: '/erlang_file_processor_template.csv',
    runLabel: 'Run File Processor',
    exportLabel: 'Export Staffing File',
    exportKey: 'enrichedFile',
    exportFilename: 'enriched_staffing_results.csv'
  },
  {
    id: 'daily-plan',
    label: 'Plan A Day',
    summary:
      'Build and optimize a one-day staffing schedule from interval demand, then visualize planned coverage versus required headcount.',
    endpoint: '/api/erlang-c/batch/daily-plan',
    templateHref: '/erlang_daily_plan_template.csv',
    runLabel: 'Build Shift Plan',
    exportLabel: 'Export Daily Plan',
    exportKey: 'dailyPlan',
    exportFilename: 'daily_staffing_plan.csv'
  },
  {
    id: 'weekly-plan',
    label: 'Weekly Plan Builder',
    summary:
      'Create a day-level and week-level staffing view from multi-day interval files, including totals, variability, and exportable planning outputs.',
    endpoint: '/api/erlang-c/batch/weekly-plan',
    templateHref: '/erlang_weekly_plan_template.csv',
    runLabel: 'Build Weekly Plan',
    exportLabel: 'Export Weekly Plan',
    exportKey: 'weeklyPlan',
    exportFilename: 'weekly_staffing_plan.csv'
  }
]

export const createDayPlannerInputs = () => ({
  assumptionSource: 'file',
  intervalDurationMinutes: 30,
  shiftPaidHours: 8,
  unpaidLunchMinutes: 30,
  lunchWindowStartHours: 3.5,
  lunchWindowEndHours: 4.5
})

export const createWeeklyPlannerInputs = () => ({
  shiftLengthHours: 8,
  productiveHoursPerDay: 6.5
})

export const createDailyGlobalAssumptions = () => ({
  meanPatienceSeconds: '',
  serviceLevelThreshold: '',
  serviceLevelTargetSeconds: '',
  maxOccupancy: '',
  shrinkage: ''
})
