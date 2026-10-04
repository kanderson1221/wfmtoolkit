export class BrowserStorageError extends Error {
  constructor(message, { code = 'storage_write_failed', storageKey = '', cause = null } = {}) {
    super(message)
    this.name = 'BrowserStorageError'
    this.code = code
    this.storageKey = storageKey
    this.cause = cause
  }
}

const STORAGE_ERROR_CODE_UNAVAILABLE = 'storage_unavailable'
const STORAGE_ERROR_CODE_SERIALIZE = 'storage_serialize_failed'
const STORAGE_ERROR_CODE_WRITE = 'storage_write_failed'
const STORAGE_ERROR_CODE_REMOVE = 'storage_remove_failed'
const STORAGE_ERROR_CODE_QUOTA = 'storage_quota_exceeded'

export const isBrowserStorageError = (error) =>
  error instanceof BrowserStorageError || error?.name === 'BrowserStorageError'

export const describeBrowserStorageError = (error, fallback = 'Unable to save locally.') => {
  if (!isBrowserStorageError(error)) {
    return fallback
  }

  switch (error.code) {
    case STORAGE_ERROR_CODE_UNAVAILABLE:
      return 'Browser data storage is unavailable.'
    case STORAGE_ERROR_CODE_SERIALIZE:
      return 'This data could not be prepared for browser storage.'
    case STORAGE_ERROR_CODE_QUOTA:
      return 'This browser is out of local data storage space.'
    case STORAGE_ERROR_CODE_REMOVE:
      return 'This browser could not clear the stored local copy.'
    case STORAGE_ERROR_CODE_WRITE:
    default:
      return 'This browser could not write to browser data storage.'
  }
}
