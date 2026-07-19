import { downloadTextFile } from '../fileDownload'

describe('downloadTextFile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete URL.createObjectURL
    delete URL.revokeObjectURL
  })

  it('downloads text with the requested file name and content type', () => {
    const blobs = []
    vi.stubGlobal('Blob', vi.fn((parts, options) => ({ parts, options })))
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob) => {
        blobs.push(blob)
        return 'blob:text-file'
      })
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadTextFile('planning-backup.json', '{"schemaVersion":2}', 'application/json')

    expect(blobs).toEqual([
      {
        parts: ['{"schemaVersion":2}'],
        options: { type: 'application/json' }
      }
    ])
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:text-file')
  })

  it('releases the object URL when browser click dispatch fails', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:failed-download')
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('Download blocked')
    })

    expect(() => downloadTextFile('actuals.csv', 'service_date')).toThrow('Download blocked')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:failed-download')
  })
})
