import { buildForecastPayload } from '../forecasting/forecastWorkspaceHelpers'
import { createForecastProject } from '../../forecasting/shared'

describe('forecastWorkspaceHelpers', () => {
  it('limits modeled training history to the selected training window', () => {
    const project = createForecastProject({
      historyRows: [
        { ds: '2024-01-01', y: 800, cap: null, floor: null },
        { ds: '2024-01-02', y: 820, cap: null, floor: null },
        { ds: '2024-01-03', y: 840, cap: null, floor: null },
        { ds: '2024-01-04', y: 860, cap: null, floor: null }
      ],
      modelConfig: {
        trainingStartDate: '2024-01-02',
        trainingEndDate: '2024-01-03'
      }
    })

    const payload = buildForecastPayload(project)

    expect(payload.history).toEqual([
      { ds: '2024-01-02', y: 820, cap: null, floor: null },
      { ds: '2024-01-03', y: 840, cap: null, floor: null }
    ])
  })

  it('removes closed weekdays and closed holidays from the training payload', () => {
    const project = createForecastProject({
      centerManagedHolidays: true,
      historyRows: [
        { ds: '2025-01-01', y: 0, cap: null, floor: null },
        { ds: '2025-01-02', y: 820, cap: null, floor: null },
        { ds: '2025-01-04', y: 640, cap: null, floor: null }
      ],
      sourceCenterSnapshot: {
        operatingWeekdays: [1, 2, 3, 4, 5]
      },
      sourceCenterHolidayProfiles: [
        {
          year: 2025,
          customHolidays: [
            {
              label: "New Year's Day",
              date: '2025-01-01',
              sourceRuleId: 'new_years_day',
              month: 1,
              day: 1
            }
          ]
        }
      ]
    })

    const payload = buildForecastPayload(project)

    expect(payload.history).toEqual([
      { ds: '2025-01-02', y: 820, cap: null, floor: null }
    ])
  })

  it('expands recurring custom holidays across the training and forecast years', () => {
    const project = createForecastProject({
      planningYear: 2025,
      forecastType: 'budget',
      planningContext: {
        groupId: 'group-1',
        planningYear: 2025
      },
      historyRows: [
        { ds: '2022-01-01', y: 800, cap: null, floor: null },
        { ds: '2024-12-31', y: 975, cap: null, floor: null }
      ],
      modelConfig: {
        builtInHolidayCountry: '',
        customHolidays: [
          {
            id: 'independence-day',
            name: 'Independence Day',
            date: '2025-07-04',
            sourceRuleId: 'independence_day',
            month: 7,
            day: 4
          }
        ]
      }
    })

    const payload = buildForecastPayload(project)

    expect(payload.modelConfig.customHolidays).toEqual([
      {
        name: 'Independence Day',
        date: '2022-07-04',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2023-07-04',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2024-07-04',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2025-07-04',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      }
    ])
  })

  it('keeps one-off custom holidays pinned to their explicit date', () => {
    const project = createForecastProject({
      planningYear: 2025,
      forecastType: 'budget',
      planningContext: {
        groupId: 'group-1',
        planningYear: 2025
      },
      historyRows: [
        { ds: '2022-01-01', y: 800, cap: null, floor: null },
        { ds: '2024-12-31', y: 975, cap: null, floor: null }
      ],
      modelConfig: {
        builtInHolidayCountry: '',
        customHolidays: [
          {
            id: 'company-day-2025',
            name: 'Company Day',
            date: '2025-12-26'
          }
        ]
      }
    })

    const payload = buildForecastPayload(project)

    expect(payload.modelConfig.customHolidays).toEqual([
      {
        name: 'Company Day',
        date: '2025-12-26',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      }
    ])
  })

  it('preserves explicitly configured zero-day holiday windows', () => {
    const project = createForecastProject({
      planningYear: 2025,
      forecastType: 'budget',
      planningContext: {
        groupId: 'group-1',
        planningYear: 2025
      },
      historyRows: [
        { ds: '2024-01-01', y: 800, cap: null, floor: null },
        { ds: '2024-12-31', y: 975, cap: null, floor: null }
      ],
      modelConfig: {
        builtInHolidayCountry: '',
        customHolidays: [
          {
            id: 'inventory-day-2025',
            name: 'Inventory Day',
            date: '2025-06-12',
            lowerWindow: 0,
            upperWindow: 0
          }
        ]
      }
    })

    const payload = buildForecastPayload(project)

    expect(payload.modelConfig.customHolidays).toEqual([
      {
        name: 'Inventory Day',
        date: '2025-06-12',
        lowerWindow: 0,
        upperWindow: 0,
        priorScale: 10
      }
    ])
  })

  it('uses center-managed holiday profiles across historical years for manual holidays', () => {
    const project = createForecastProject({
      planningYear: 2025,
      forecastType: 'budget',
      centerManagedHolidays: true,
      planningContext: {
        groupId: 'group-1',
        planningYear: 2025
      },
      historyRows: [
        { ds: '2022-01-01', y: 800, cap: null, floor: null },
        { ds: '2024-12-31', y: 975, cap: null, floor: null }
      ],
      sourceCenterHolidayProfiles: [
        {
          year: 2022,
          customHolidays: [
            { label: 'Independence Day', date: '2022-07-04', month: 7, day: 4 }
          ]
        },
        {
          year: 2023,
          customHolidays: [
            { label: 'Independence Day', date: '2023-07-04', month: 7, day: 4 }
          ]
        },
        {
          year: 2024,
          customHolidays: [
            { label: 'Independence Day', date: '2024-07-04', month: 7, day: 4 }
          ]
        },
        {
          year: 2025,
          customHolidays: [
            { label: 'Independence Day', date: '2025-07-04', month: 7, day: 4 }
          ]
        }
      ],
      modelConfig: {
        builtInHolidayCountry: '',
        customHolidays: [
          {
            id: 'independence-day',
            name: 'Independence Day',
            date: '2025-07-04'
          }
        ]
      }
    })

    const payload = buildForecastPayload(project)

    expect(payload.modelConfig.customHolidays).toEqual([
      {
        name: 'Independence Day',
        date: '2022-07-04',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2023-07-04',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2024-07-04',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2025-07-04',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      }
    ])
  })

  it('projects center-managed rule-based holidays into missing historical years', () => {
    const project = createForecastProject({
      planningYear: 2026,
      forecastType: 'budget',
      centerManagedHolidays: true,
      planningContext: {
        groupId: 'group-1',
        planningYear: 2026
      },
      historyRows: [
        { ds: '2022-01-01', y: 800, cap: null, floor: null },
        { ds: '2024-12-31', y: 975, cap: null, floor: null }
      ],
      sourceCenterHolidayProfiles: [
        {
          year: 2026,
          customHolidays: [
            {
              label: 'Thanksgiving Day',
              date: '2026-11-26',
              sourceRuleId: 'thanksgiving_day',
              month: 11,
              day: 26
            }
          ]
        }
      ],
      modelConfig: {
        builtInHolidayCountry: '',
        customHolidays: [
          {
            id: 'thanksgiving-day',
            name: 'Thanksgiving Day',
            date: '2026-11-26',
            sourceRuleId: 'thanksgiving_day',
            month: 11,
            day: 26
          }
        ]
      }
    })

    const payload = buildForecastPayload(project)

    expect(payload.modelConfig.customHolidays).toEqual([
      {
        name: 'Thanksgiving Day',
        date: '2022-11-24',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Thanksgiving Day',
        date: '2023-11-23',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Thanksgiving Day',
        date: '2024-11-28',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Thanksgiving Day',
        date: '2025-11-27',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      },
      {
        name: 'Thanksgiving Day',
        date: '2026-11-26',
        lowerWindow: -1,
        upperWindow: 1,
        priorScale: 10
      }
    ])
  })

  it('uses fixed default settings for built-in weekly and yearly seasonalities', () => {
    const project = createForecastProject({
      historyRows: [
        { ds: '2024-01-01', y: 800, cap: null, floor: null },
        { ds: '2024-01-02', y: 820, cap: null, floor: null }
      ],
      modelConfig: {
        weeklySeasonalityEnabled: true,
        monthlySeasonalityEnabled: true,
        yearlySeasonalityEnabled: true,
        weeklyFourierOrder: 12,
        weeklyPriorScale: 2,
        yearlyFourierOrder: 20,
        yearlyPriorScale: 3
      }
    })

    const payload = buildForecastPayload(project)

    expect(payload.modelConfig.weeklySeasonality).toEqual({
      enabled: true,
      fourierOrder: 3,
      priorScale: 10
    })
    expect(payload.modelConfig.yearlySeasonality).toEqual({
      enabled: true,
      fourierOrder: 10,
      priorScale: 10
    })
    expect(payload.modelConfig.monthlySeasonality).toEqual({
      enabled: true,
      periodDays: 30.5,
      fourierOrder: 5,
      priorScale: 10
    })
  })
})
