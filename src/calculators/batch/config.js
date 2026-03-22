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
  }
]
