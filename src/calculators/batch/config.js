export const WORKFLOWS = [
  {
    id: 'file-processor',
    label: 'File Processor',
    summary:
      'Upload a CSV of interval demand and return an enriched file with required agents, required headcount, and core service metrics for every row.',
    endpoint: '/api/erlang-c/batch/file-processor/upload',
    templateHref: '/erlang_file_processor_template.csv',
    runLabel: 'Run File Processor',
    exportLabel: 'Download Enriched File',
    errorExportLabel: 'Download Error Report',
    maxFileSizeBytes: 50 * 1024 * 1024
  }
]
