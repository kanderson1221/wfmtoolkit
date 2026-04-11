import { buildForecastPayload } from '../forecasting/forecastWorkspaceHelpers'
import { createForecastProject } from '../../forecasting/shared'

describe('forecastWorkspaceHelpers', () => {
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
        lowerWindow: 0,
        upperWindow: 0,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2023-07-04',
        lowerWindow: 0,
        upperWindow: 0,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2024-07-04',
        lowerWindow: 0,
        upperWindow: 0,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2025-07-04',
        lowerWindow: 0,
        upperWindow: 0,
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
        lowerWindow: 0,
        upperWindow: 0,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2023-07-04',
        lowerWindow: 0,
        upperWindow: 0,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2024-07-04',
        lowerWindow: 0,
        upperWindow: 0,
        priorScale: 10
      },
      {
        name: 'Independence Day',
        date: '2025-07-04',
        lowerWindow: 0,
        upperWindow: 0,
        priorScale: 10
      }
    ])
  })
})
