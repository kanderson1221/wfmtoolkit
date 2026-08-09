import {
  buildPlannerActualsIntradayErlangPayload,
  buildPlannerIntradayErlangInputSignature,
  buildPlannerIntradayErlangPayload,
  mergeIntradayErlangMonthlyRecords
} from '../intradayErlang'

describe('intraday Erlang planner payloads', () => {
  it('includes the minimum headcount in the saved-result input signature', () => {
    const baseRow = {
      monthIndex: 0,
      serviceDate: '2026-01-02',
      intervalStart: '2026-01-02T08:00:00',
      callsOffered: 10,
      averageHandleTime: 300,
      intervalLengthMinutes: 30,
      serviceLevelGoal: 80,
      serviceLevelThreshold: 20,
      maxOccupancy: 85,
      minimumHeadcount: 0
    }

    expect(buildPlannerIntradayErlangInputSignature([baseRow])).not.toBe(
      buildPlannerIntradayErlangInputSignature([
        { ...baseRow, minimumHeadcount: 2 }
      ])
    )
  })

  it('builds 48 unique interval rows for one always-open forecast day', () => {
    const payload = buildPlannerIntradayErlangPayload({
      planningYear: 2026,
      demandSource: {
        forecastDailySnapshot: [
          { serviceDate: '2026-01-02', monthIndex: 0, contacts: 480, ahtSeconds: 300 }
        ]
      },
      monthlyRecords: [
        { monthIndex: 0, occupancyPercent: 90, adherencePercent: 95 }
      ],
      operatingWeekdays: [0, 1, 2, 3, 4, 5, 6],
      operatingScheduleMode: 'always_open',
      operatingOpenTime: '',
      operatingCloseTime: '',
      serviceLevelPercent: 80,
      serviceLevelThresholdSeconds: 20,
      intraday: { intervalLengthMinutes: 30, intervalRatios: [] }
    })

    expect(payload.status).toBe('ready')
    expect(payload.rows).toHaveLength(48)
    expect(new Set(payload.rows.map((row) => row.intervalStart)).size).toBe(48)
    expect(payload.rows[0].intervalStart).toBe('2026-01-02T00:00:00')
    expect(payload.rows.at(-1).intervalStart).toBe('2026-01-02T23:30:00')
  })

  it('rejects 23:59 as a configured close time for 30-minute intervals', () => {
    const payload = buildPlannerIntradayErlangPayload({
      planningYear: 2026,
      demandSource: {
        forecastDailySnapshot: [
          { serviceDate: '2026-01-02', monthIndex: 0, contacts: 480, ahtSeconds: 300 }
        ]
      },
      monthlyRecords: [{ monthIndex: 0, occupancyPercent: 90, adherencePercent: 95 }],
      operatingWeekdays: [1, 2, 3, 4, 5],
      operatingScheduleMode: 'configured_hours',
      operatingOpenTime: '00:00',
      operatingCloseTime: '23:59',
      serviceLevelPercent: 80,
      serviceLevelThresholdSeconds: 20,
      intraday: { intervalLengthMinutes: 30, intervalRatios: [] }
    })

    expect(payload).toMatchObject({
      status: 'schedule_required',
      rows: [],
      message: expect.stringContaining('30-minute staffing intervals')
    })
  })

  it('blocks Erlang mode when no applied daily forecast is available', () => {
    expect(
      buildPlannerIntradayErlangPayload({
        planningYear: 2026,
        demandSource: {},
        monthlyRecords: [],
        operatingWeekdays: [1, 2, 3, 4, 5],
        operatingOpenTime: '08:00',
        operatingCloseTime: '09:00',
        serviceLevelPercent: 80,
        serviceLevelThresholdSeconds: 20,
        intraday: {
          intervalLengthMinutes: 30,
          intervalRatios: [
            { startTime: '08:00', ratioPercent: 50 },
            { startTime: '08:30', ratioPercent: 50 }
          ]
        }
      })
    ).toMatchObject({
      status: 'forecast_required',
      rows: []
    })
  })

  it('builds open-day interval rows from the applied daily forecast and forecast-owned monthly AHT', () => {
    const payload = buildPlannerIntradayErlangPayload({
      planningYear: 2026,
      demandSource: {
        forecastDailySnapshot: [
          { serviceDate: '2026-01-01', monthIndex: 0, contacts: 100 },
          { serviceDate: '2026-01-02', monthIndex: 0, contacts: 100 }
        ],
        forecastMonthSnapshot: [
          { monthIndex: 0, monthLabel: 'Jan 2026', ahtSeconds: 300 }
        ]
      },
      monthlyRecords: [
        {
          monthIndex: 0,
          occupancyPercent: 90
        }
      ],
      operatingWeekdays: [1, 2, 3, 4, 5],
      customHolidays: [
        { id: 'new-years-day', label: "New Year's Day", date: '2026-01-01' }
      ],
      operatingOpenTime: '08:00',
      operatingCloseTime: '09:00',
      serviceLevelPercent: 80,
      serviceLevelThresholdSeconds: 20,
      intraday: {
        intervalLengthMinutes: 30,
        minimumHeadcount: 3,
        intervalRatios: [
          { startTime: '08:00', ratioPercent: 25 },
          { startTime: '08:30', ratioPercent: 75 }
        ]
      }
    })

    expect(payload.status).toBe('ready')
    expect(payload.rows).toEqual([
      expect.objectContaining({
        serviceDate: '2026-01-02',
        intervalStart: '2026-01-02T08:00:00',
        callsOffered: 25,
        averageHandleTime: 300,
        maxOccupancy: 90,
        minimumHeadcount: 3
      }),
      expect.objectContaining({
        serviceDate: '2026-01-02',
        intervalStart: '2026-01-02T08:30:00',
        callsOffered: 75,
        averageHandleTime: 300,
        maxOccupancy: 90,
        minimumHeadcount: 3
      })
    ])
  })

  it('blocks interval calculations when a monthly occupancy or adherence assumption is zero', () => {
    const payload = buildPlannerIntradayErlangPayload({
      planningYear: 2026,
      demandSource: {
        forecastDailySnapshot: [
          { serviceDate: '2026-01-02', monthIndex: 0, contacts: 100 }
        ],
        forecastMonthSnapshot: [
          { monthIndex: 0, monthLabel: 'Jan 2026', ahtSeconds: 300 }
        ]
      },
      monthlyRecords: [
        {
          monthIndex: 0,
          occupancyPercent: 0,
          adherencePercent: 95
        }
      ],
      operatingWeekdays: [1, 2, 3, 4, 5],
      operatingOpenTime: '08:00',
      operatingCloseTime: '09:00',
      serviceLevelPercent: 80,
      serviceLevelThresholdSeconds: 20,
      intraday: {
        intervalLengthMinutes: 30,
        intervalRatios: [
          { startTime: '08:00', ratioPercent: 50 },
          { startTime: '08:30', ratioPercent: 50 }
        ]
      }
    })

    expect(payload).toMatchObject({
      status: 'random_assumptions_required',
      rows: [],
      message: expect.stringContaining('Jan')
    })
  })

  it('builds actuals Erlang payload rows from Data tab daily actual contacts and AHT', () => {
    const payload = buildPlannerActualsIntradayErlangPayload({
      planningYear: 2026,
      actualDailyRows: [
        { serviceDate: '2026-01-01', contacts: 100, ahtSeconds: 300 },
        { serviceDate: '2026-01-02', contacts: 800, ahtSeconds: 330 },
        { serviceDate: '2025-01-02', contacts: 900, ahtSeconds: 340 }
      ],
      monthlyRecords: [
        {
          monthIndex: 0,
          occupancyPercent: 90
        }
      ],
      operatingWeekdays: [1, 2, 3, 4, 5],
      customHolidays: [
        { id: 'new-years-day', label: "New Year's Day", date: '2026-01-01' }
      ],
      operatingOpenTime: '08:00',
      operatingCloseTime: '09:00',
      serviceLevelPercent: 80,
      serviceLevelThresholdSeconds: 20,
      intraday: {
        intervalLengthMinutes: 30,
        intervalRatios: [
          { startTime: '08:00', ratioPercent: 25 },
          { startTime: '08:30', ratioPercent: 75 }
        ]
      }
    })

    expect(payload.status).toBe('ready')
    expect(payload.rows).toEqual([
      expect.objectContaining({
        serviceDate: '2026-01-02',
        callsOffered: 200,
        averageHandleTime: 330
      }),
      expect.objectContaining({
        serviceDate: '2026-01-02',
        callsOffered: 600,
        averageHandleTime: 330
      })
    ])
  })

  it('normalizes stored interval ratios before flattening daily forecast demand', () => {
    const payload = buildPlannerIntradayErlangPayload({
      planningYear: 2026,
      demandSource: {
        forecastDailySnapshot: [
          { serviceDate: '2026-01-02', monthIndex: 0, contacts: 100 }
        ],
        forecastMonthSnapshot: [
          { monthIndex: 0, monthLabel: 'Jan 2026', ahtSeconds: 300 }
        ]
      },
      monthlyRecords: [
        {
          monthIndex: 0,
          occupancyPercent: 90
        }
      ],
      operatingWeekdays: [1, 2, 3, 4, 5],
      operatingOpenTime: '08:00',
      operatingCloseTime: '09:00',
      serviceLevelPercent: 80,
      serviceLevelThresholdSeconds: 20,
      intraday: {
        intervalLengthMinutes: 30,
        intervalRatios: [
          { startTime: '08:00', ratioPercent: 20 },
          { startTime: '08:30', ratioPercent: 60 }
        ]
      }
    })

    expect(payload.status).toBe('ready')
    expect(payload.rows).toEqual([
      expect.objectContaining({
        intervalStart: '2026-01-02T08:00:00',
        callsOffered: 25
      }),
      expect.objectContaining({
        intervalStart: '2026-01-02T08:30:00',
        callsOffered: 75
      })
    ])
  })

  it('blocks when the applied forecast does not include monthly AHT assumptions', () => {
    expect(
      buildPlannerIntradayErlangPayload({
        planningYear: 2026,
        demandSource: {
          forecastDailySnapshot: [
            { serviceDate: '2026-01-02', monthIndex: 0, contacts: 100 }
          ],
          forecastMonthSnapshot: [
            { monthIndex: 0, monthLabel: 'Jan 2026', ahtSeconds: null }
          ]
        },
        monthlyRecords: [
          {
            monthIndex: 0,
            occupancyPercent: 90
          }
        ],
        operatingWeekdays: [1, 2, 3, 4, 5],
        operatingOpenTime: '08:00',
        operatingCloseTime: '09:00',
        serviceLevelPercent: 80,
        serviceLevelThresholdSeconds: 20,
        intraday: {
          intervalLengthMinutes: 30,
          intervalRatios: [
            { startTime: '08:00', ratioPercent: 50 },
            { startTime: '08:30', ratioPercent: 50 }
          ]
        }
      })
    ).toMatchObject({
      status: 'aht_required'
    })
  })

  it('uses monthly record AHT as a compatibility fallback for saved applied forecasts', () => {
    const payload = buildPlannerIntradayErlangPayload({
      planningYear: 2026,
      demandSource: {
        forecastDailySnapshot: [
          { serviceDate: '2026-01-02', monthIndex: 0, contacts: 100 }
        ],
        forecastMonthSnapshot: [
          { monthIndex: 0, monthLabel: 'Jan 2026', ahtSeconds: null }
        ]
      },
      monthlyRecords: [
        {
          monthIndex: 0,
          ahtSeconds: 315,
          occupancyPercent: 90
        }
      ],
      operatingWeekdays: [1, 2, 3, 4, 5],
      operatingOpenTime: '08:00',
      operatingCloseTime: '09:00',
      serviceLevelPercent: 80,
      serviceLevelThresholdSeconds: 20,
      intraday: {
        intervalLengthMinutes: 30,
        intervalRatios: [
          { startTime: '08:00', ratioPercent: 50 },
          { startTime: '08:30', ratioPercent: 50 }
        ]
      }
    })

    expect(payload.status).toBe('ready')
    expect(payload.rows).toEqual([
      expect.objectContaining({
        averageHandleTime: 315
      }),
      expect.objectContaining({
        averageHandleTime: 315
      })
    ])
  })

  it('replaces workload-ratio outputs with neutral Erlang outputs until a month is calculated', () => {
    const merged = mergeIntradayErlangMonthlyRecords(
      [
        {
          monthIndex: 0,
          paidHoursPerDay: 8,
          paidHoursPerMonth: 160,
          scheduledPercent: 72.5,
          adherenceLossPercent: 3.6,
          occupancyLossPercent: 7.1,
          randomLossPercent: 10.7,
          designFactorPercent: 61.8,
          workloadStaffingRatio: 1.62,
          requiredStaffHours: 123,
          requiredHeadcount: 4.2,
          peakDayRequiredHeadcount: 5.4,
          workloadHours: 80
        },
        {
          monthIndex: 1,
          paidHoursPerDay: 8,
          paidHoursPerMonth: 160,
          scheduledPercent: 72.5,
          adherenceLossPercent: 3.6,
          occupancyLossPercent: 7.1,
          randomLossPercent: 10.7,
          designFactorPercent: 61.8,
          workloadStaffingRatio: 1.62,
          requiredStaffHours: 321,
          requiredHeadcount: 6.5,
          peakDayRequiredHeadcount: 8.2,
          workloadHours: 90
        }
      ],
      new Map([
        [
          1,
          {
            workloadHours: 88,
            erlangStaffedHours: 200,
            weightedOccupancyPercent: 84.5,
            weightedServiceLevelPercent: 79.2,
            peakIntervalRequiredHeadcount: 12
          }
        ]
      ]),
      [
        {
          monthIndex: 1,
          serviceDate: '2026-02-01',
          totalLaborHoursNet: 11.5
        },
        {
          monthIndex: 1,
          serviceDate: '2026-02-02',
          totalLaborHoursNet: 14.25
        }
      ]
    )

    expect(merged[0]).toMatchObject({
      randomLossPercent: 3.6,
      occupancyLossPercent: 0,
      designFactorPercent: 68.9,
      erlangStaffedHours: null,
      weightedOccupancyPercent: null,
      weightedServiceLevelPercent: null,
      requiredStaffHours: 0,
      requiredHeadcount: 0,
      peakDayRequiredHeadcount: 0,
      peakIntervalRequiredHeadcount: null,
      workloadHours: 80
    })
    expect(merged[0].workloadStaffingRatio).toBeCloseTo(1.451378809869376, 12)
    expect(merged[1]).toMatchObject({
      workloadHours: 88,
      erlangStaffedHours: 200,
      weightedOccupancyPercent: 84.5,
      weightedServiceLevelPercent: 79.2,
      randomLossPercent: 3.6,
      occupancyLossPercent: 0,
      designFactorPercent: 68.9,
      peakIntervalRequiredHeadcount: 12
    })
    expect(merged[1].requiredStaffHours).toBeCloseTo(290.2758, 4)
    expect(merged[1].requiredHeadcount).toBeCloseTo(1.81422375, 6)
    expect(merged[1].peakDayRequiredHeadcount).toBeGreaterThan(merged[1].requiredHeadcount)
    expect(merged[1].peakDayRequiredHeadcount).toBeCloseTo(2.5853, 3)
  })

  it('keeps merged Erlang requirements unavailable when stored occupancy is zero', () => {
    const [merged] = mergeIntradayErlangMonthlyRecords(
      [
        {
          monthIndex: 0,
          occupancyPercent: 0,
          paidHoursPerDay: 8,
          paidHoursPerMonth: 160,
          scheduledPercent: 72.5,
          adherenceLossPercent: 3.6,
          workloadHours: 80
        }
      ],
      new Map([
        [
          0,
          {
            workloadHours: 88,
            erlangStaffedHours: 200,
            peakIntervalRequiredHeadcount: 12
          }
        ]
      ])
    )

    expect(merged).toMatchObject({
      occupancyLossPercent: 0,
      workloadStaffingRatio: null,
      requiredStaffHours: null,
      requiredHeadcount: null,
      peakDayRequiredHeadcount: null
    })
  })
})
