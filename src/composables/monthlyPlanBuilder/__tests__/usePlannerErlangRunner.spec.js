import { nextTick, ref } from 'vue'

import { usePlannerErlangRunner } from '../usePlannerErlangRunner'

const responseFor = (monthIndex) => ({
  ok: true,
  json: async () => ({
    monthlyPlans: [{ monthIndex, erlangStaffedHours: 10 }],
    intervalPlans: [{ monthIndex, requiredStaffNet: 2 }],
    dailyPlans: [{ monthIndex, serviceDate: '2026-01-02' }]
  })
})

const createRunner = (actuals) => {
  const payloadState = ref({ status: 'ready', rows: [{ monthIndex: 1 }, { monthIndex: 0 }] })
  const storedResults = ref(null)
  return { payloadState, storedResults, ...usePlannerErlangRunner({ payloadState, storedResults, actuals }) }
}

afterEach(() => vi.unstubAllGlobals())

describe.each([false, true])('shared Erlang execution (actuals: %s)', (actuals) => {
  it('runs months in order, reports progress, and retains the appropriate result detail', async () => {
    let finishSecond
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(responseFor(0))
      .mockImplementationOnce(() => new Promise((resolve) => { finishSecond = resolve }))
    vi.stubGlobal('fetch', fetchSpy)
    const runner = createRunner(actuals)
    const pending = runner.runCalculations()
    while (!finishSecond) await nextTick()

    expect(fetchSpy.mock.calls.map(([, request]) => JSON.parse(request.body).rows[0].monthIndex)).toEqual([0, 1])
    expect(runner.erlangStatus.value.progress).toMatchObject({ completedMonths: 1, completedRows: 1, totalRows: 2 })
    expect(await runner.runCalculations()).toBe(false)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    finishSecond(responseFor(1))
    expect(await pending).toBe(true)
    await nextTick()
    expect(runner.storedResults.value.monthlyOutputs.map((row) => row.monthIndex)).toEqual([0, 1])
    expect(runner.storedResults.value.intervalOutputs).toHaveLength(actuals ? 0 : 2)
    expect(runner.storedResults.value.dailyOutputs).toHaveLength(actuals ? 0 : 2)
  })

  it('discards an old response when inputs change during a calculation', async () => {
    let finish
    const fetchSpy = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    vi.stubGlobal('fetch', fetchSpy)
    const runner = createRunner(actuals)
    const pending = runner.runCalculations()
    runner.payloadState.value.rows[0].callsOffered = 500
    await nextTick()
    finish(responseFor(0))

    expect(await pending).toBe(false)
    expect(runner.storedResults.value).toBeNull()
    expect(runner.monthlyOutputsByMonthIndex.value.size).toBe(0)
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('does not replace saved evidence with partial output when a later month fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(responseFor(0)).mockResolvedValueOnce(responseFor(1)))
    const runner = createRunner(actuals)
    expect(await runner.runCalculations()).toBe(true)
    await nextTick()
    const saved = runner.storedResults.value
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(responseFor(0)).mockResolvedValueOnce({
      ok: false, status: 503, text: async () => '{"detail":"Capacity is busy"}'
    }))

    expect(await runner.runCalculations()).toBe(false)
    expect(runner.storedResults.value).toBe(saved)
    expect(runner.erlangStatus.value).toMatchObject({ status: 'error', message: 'Capacity is busy', hasResults: true })
    expect(runner.monthlyOutputsByMonthIndex.value.size).toBe(actuals ? 0 : 2)
  })
})
