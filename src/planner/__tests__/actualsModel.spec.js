import { computeActualsRecords, summarizeActualsRecords } from '../actualsModel'

describe('actualsModel', () => {
  it('derives actual requirement, gap, and overhead from entered actuals', () => {
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
