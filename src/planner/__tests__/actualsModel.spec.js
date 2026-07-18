import {
  buildActualsMonthsFromDailyRows,
  computeActualsRecords,
  summarizeActualsRecords
} from '../actualsModel'

describe('actualsModel', () => {
  it('rolls Data tab daily actuals into monthly contacts and weighted AHT', () => {
    const months = buildActualsMonthsFromDailyRows(
      [
        { serviceDate: '2026-01-02', contacts: 100, ahtSeconds: 300 },
        { serviceDate: '2026-01-03', contacts: 300, ahtSeconds: 340 },
        { serviceDate: '2025-01-03', contacts: 1000, ahtSeconds: 500 }
      ],
      2026
    )

    expect(months[0]).toMatchObject({
      monthIndex: 0,
      actualContacts: 400,
      actualAhtSeconds: 330,
      loadedDaysCount: 2
    })
    expect(months[1]).toMatchObject({
      actualContacts: null,
      actualAhtSeconds: null,
      loadedDaysCount: 0
    })
  })

  it('derives actual requirement, gap, and overhead from monthly Data tab actuals', () => {
    const records = computeActualsRecords(
      [
        {
          monthIndex: 0,
          label: 'Jan',
          fullLabel: 'January',
          contacts: 10000,
          ahtSeconds: 300,
          workloadHours: 833.3333333,
          requiredHeadcount: 10,
          workloadStaffingRatio: 1.5,
          paidHoursPerMonth: 160
        }
      ],
      [
        {
          startingRosterHeadcount: 20,
          startingFrontlineHeadcount: 18,
          endingRosterHeadcount: 19,
          endingFrontlineHeadcount: 17,
          gapToRequirement: 8
        }
      ],
      [
        {
          actualContacts: 12000,
          actualAhtSeconds: 330
        }
      ]
    )

    expect(records[0]).toMatchObject({
      isLoaded: true,
      plannedContacts: 10000,
      plannedAhtSeconds: 300,
      plannedWorkloadHours: 833.3333333,
      plannedRequiredHeadcount: 10,
      plannedStartingTotalHeadcount: 20,
      plannedStartingFrontlineHeadcount: 18,
      plannedEndingTotalHeadcount: 19,
      plannedEndingFrontlineHeadcount: 17,
      plannedGapToRequirement: 8,
      actualWorkloadHours: 1100,
      actualRequiredHeadcount: 10.3125,
      requiredHeadcountVariance: 0.3125
    })
  })

  it('uses actual Erlang staffed hours for intraday actual requirements when provided', () => {
    const records = computeActualsRecords(
      [
        {
          monthIndex: 0,
          label: 'Jan',
          fullLabel: 'January',
          contacts: 10000,
          ahtSeconds: 300,
          workloadHours: 833.3333333,
          requiredHeadcount: 10,
          workloadStaffingRatio: 1.25,
          paidHoursPerMonth: 160
        }
      ],
      [
        {
          startingRosterHeadcount: 20,
          startingFrontlineHeadcount: 18,
          endingRosterHeadcount: 19,
          endingFrontlineHeadcount: 17,
          gapToRequirement: 8
        }
      ],
      [
        {
          actualContacts: 12000,
          actualAhtSeconds: 330
        }
      ],
      new Map([
        [
          0,
          {
            erlangStaffedHours: 1400
          }
        ]
      ])
    )

    expect(records[0]).toMatchObject({
      actualWorkloadHours: 1100,
      actualErlangStaffedHours: 1400,
      actualRequiredStaffHours: 1750,
      actualRequiredHeadcount: 10.9375,
      requiredHeadcountVariance: 0.9375
    })
  })

  it('leaves intraday actual requirement blank until the actual Erlang rerun returns', () => {
    const records = computeActualsRecords(
      [
        {
          monthIndex: 0,
          label: 'Jan',
          fullLabel: 'January',
          contacts: 10000,
          ahtSeconds: 300,
          workloadHours: 833.3333333,
          requiredHeadcount: 10,
          workloadStaffingRatio: 1.5,
          paidHoursPerMonth: 160
        }
      ],
      [{}],
      [
        {
          actualContacts: 12000,
          actualAhtSeconds: 330
        }
      ],
      new Map()
    )

    expect(records[0]).toMatchObject({
      actualWorkloadHours: 1100,
      actualErlangStaffedHours: null,
      actualRequiredStaffHours: null,
      actualRequiredHeadcount: null,
      requiredHeadcountVariance: null
    })
  })

  it('leaves actual requirements unavailable when planned capacity is invalid', () => {
    const records = computeActualsRecords(
      [
        {
          monthIndex: 0,
          contacts: 1000,
          ahtSeconds: 300,
          workloadHours: 83.333,
          paidHoursPerMonth: 160,
          requiredHeadcount: null,
          workloadStaffingRatio: null
        }
      ],
      [],
      [
        {
          actualContacts: 1200,
          actualAhtSeconds: 300,
          loadedDaysCount: 20
        }
      ]
    )

    expect(records[0]).toMatchObject({
      actualWorkloadHours: 100,
      actualRequiredStaffHours: null,
      actualRequiredHeadcount: null,
      requiredHeadcountVariance: null
    })
  })

  it('summarizes loaded actual months, average variances, and peak requirement values', () => {
    const summary = summarizeActualsRecords([
      {
        isLoaded: true,
        contactsVariance: 200,
        ahtVarianceSeconds: 5,
        requiredHeadcountVariance: 1,
        actualRequiredHeadcount: 12,
        plannedRequiredHeadcount: 10
      },
      {
        isLoaded: true,
        contactsVariance: -100,
        ahtVarianceSeconds: -1,
        requiredHeadcountVariance: -0.5,
        actualRequiredHeadcount: 9,
        plannedRequiredHeadcount: 11
      },
      {
        isLoaded: false,
        contactsVariance: null,
        ahtVarianceSeconds: null,
        requiredHeadcountVariance: null,
        actualRequiredHeadcount: null,
        plannedRequiredHeadcount: 8
      }
    ])

    expect(summary).toMatchObject({
      loadedMonthsCount: 2,
      contactsVariance: 100,
      averageAhtVarianceSeconds: 2,
      averageRequiredHeadcountVariance: 0.25,
      peakActualRequiredHeadcount: 12,
      peakPlannedRequiredHeadcount: 11
    })
  })
})
