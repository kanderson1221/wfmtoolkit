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

const QUOTA_ERROR_NAMES = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'])
const QUOTA_ERROR_CODES = new Set([22, 1014])

const resolveLocalStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage || null
  } catch {
    return null
  }
}

const readRawValue = (storage, storageKey) => {
  if (!storage) {
    return null
  }

  if (typeof storage.getItem === 'function') {
    return storage.getItem(storageKey)
  }

  if (typeof storage === 'object') {
    return storage[storageKey] ?? null
  }

  return null
}

const writeRawValue = (storage, storageKey, value) => {
  if (!storage) {
    throw new BrowserStorageError('Local storage is unavailable.', {
      code: STORAGE_ERROR_CODE_UNAVAILABLE,
      storageKey
    })
  }

  if (typeof storage.setItem === 'function') {
    storage.setItem(storageKey, value)
    return
  }

  if (typeof storage === 'object') {
    storage[storageKey] = value
    return
  }

  throw new BrowserStorageError('Local storage is unavailable.', {
    code: STORAGE_ERROR_CODE_UNAVAILABLE,
    storageKey
  })
}

const removeRawValue = (storage, storageKey) => {
  if (!storage) {
    return
  }

  if (typeof storage.removeItem === 'function') {
    storage.removeItem(storageKey)
    return
  }

  if (typeof storage === 'object') {
    delete storage[storageKey]
  }
}

const isQuotaExceededError = (error) =>
  QUOTA_ERROR_NAMES.has(error?.name) || QUOTA_ERROR_CODES.has(Number(error?.code))

const createWriteError = (storageKey, cause, fallbackCode = STORAGE_ERROR_CODE_WRITE) =>
  new BrowserStorageError(
    isQuotaExceededError(cause)
      ? 'Local storage is full.'
      : 'Unable to write to local storage.',
    {
      code: isQuotaExceededError(cause) ? STORAGE_ERROR_CODE_QUOTA : fallbackCode,
      storageKey,
      cause
    }
  )

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

export const readJsonFromLocalStorage = (storageKey, fallback = null) => {
  return readJsonFromLocalStorageResult(storageKey, fallback).value
}

export const readJsonFromLocalStorageResult = (storageKey, fallback = null) => {
  const storage = resolveLocalStorage()
  if (!storage) {
    return {
      value: fallback,
      error: new BrowserStorageError('Local storage is unavailable.', {
        code: STORAGE_ERROR_CODE_UNAVAILABLE,
        storageKey
      })
    }
  }

  try {
    const rawValue = readRawValue(storage, storageKey)
    if (!rawValue) {
      return {
        value: fallback,
        error: null
      }
    }

    const parsedValue = JSON.parse(rawValue)
    return {
      value: parsedValue ?? fallback,
      error: null
    }
  } catch (error) {
    return {
      value: fallback,
      error: new BrowserStorageError('Unable to read from local storage.', {
        code: STORAGE_ERROR_CODE_WRITE,
        storageKey,
        cause: error
      })
    }
  }
}

export const writeJsonToLocalStorage = (storageKey, value) => {
  let serializedValue

  try {
    serializedValue = JSON.stringify(value)
  } catch (error) {
    throw new BrowserStorageError('This data could not be prepared for local storage.', {
      code: STORAGE_ERROR_CODE_SERIALIZE,
      storageKey,
      cause: error
    })
  }

  const storage = resolveLocalStorage()

  try {
    writeRawValue(storage, storageKey, serializedValue)
  } catch (error) {
    if (isBrowserStorageError(error)) {
      throw error
    }

    throw createWriteError(storageKey, error)
  }
}

export const removeLocalStorageItem = (storageKey) => {
  const storage = resolveLocalStorage()

  try {
    removeRawValue(storage, storageKey)
  } catch (error) {
    throw new BrowserStorageError('Unable to clear the stored local copy.', {
      code: STORAGE_ERROR_CODE_REMOVE,
      storageKey,
      cause: error
    })
  }
}
