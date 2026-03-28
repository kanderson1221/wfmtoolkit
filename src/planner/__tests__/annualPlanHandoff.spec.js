import {
  buildInheritedTrainingClasses,
  resolveLinkedOpeningPosition
} from '../annualPlanHandoff'

describe('annualPlanHandoff', () => {
  it('derives the next-year opening from explicit handoff values first', () => {
    const opening = resolveLinkedOpeningPosition({
      priorPlan: {
        planningYear: 2026,
        nextYearOpening: {
          rosterHeadcount: 48,
          frontlineHeadcount: 41
        },
        summary: {
          endingRosterHeadcount: 44,
          endingFrontlineHeadcount: 38
        }
      },
      startingHeadcount: 10,
      startingFrontlineHeadcount: 8
    })

    expect(opening).toMatchObject({
      rosterHeadcount: 48,
      frontlineHeadcount: 41,
      isInherited: true,
      usesExplicitHandoff: true
    })
  })

  it('falls back to the prior-year ending summary when no explicit handoff exists', () => {
    const opening = resolveLinkedOpeningPosition({
      priorPlan: {
        planningYear: 2026,
        summary: {
          endingRosterHeadcount: 44,
          endingFrontlineHeadcount: 38
        }
      },
      startingHeadcount: 10,
      startingFrontlineHeadcount: 8
    })

    expect(opening).toMatchObject({
      rosterHeadcount: 44,
      frontlineHeadcount: 38,
      isInherited: true,
      usesExplicitHandoff: false
    })
  })

  it('keeps roster headcount at or above an explicit frontline handoff when roster is omitted', () => {
    const opening = resolveLinkedOpeningPosition({
      priorPlan: {
        planningYear: 2026,
        nextYearOpening: {
          frontlineHeadcount: 42
        },
        summary: {
          endingRosterHeadcount: 40,
          endingFrontlineHeadcount: 34
        }
      },
      startingHeadcount: 10,
      startingFrontlineHeadcount: 8
    })

    expect(opening).toMatchObject({
      rosterHeadcount: 42,
      frontlineHeadcount: 42,
      isInherited: true,
      usesExplicitHandoff: true
    })
  })

  it('filters inherited classes so only prior-year carry-in remains visible in January', () => {
    const inheritedClasses = buildInheritedTrainingClasses({
      planningYear: 2027,
      priorPlan: {
        id: 'plan-2026',
        planningYear: 2026,
        trainingSettings: {
          trainingDurationWorkdays: 10,
          postTrainingNestingDays: 5,
          graduationYieldPercent: 90
        },
        trainingClasses: [
          {
            id: 'carry-in',
            hireDate: '2026-12-18',
            hireCount: 20,
            graduationDate: '2027-01-05',
            frontlineReadyDate: '2027-01-12',
            graduatingHeadcount: 20,
            projectedGraduatingHeadcount: 18,
            trainingFalloutHeadcount: 2
          },
          {
            id: 'finished',
            hireDate: '2026-11-03',
            hireCount: 12,
            graduationDate: '2026-11-14',
            frontlineReadyDate: '2026-11-18'
          }
        ]
      }
    })

    expect(inheritedClasses).toHaveLength(1)
    expect(inheritedClasses[0]).toMatchObject({
      source: 'inherited',
      inheritedFromPlanId: 'plan-2026',
      inheritedFromPlanningYear: 2026,
      hireDate: '2026-12-18',
      graduationDate: '2027-01-05',
      frontlineReadyDate: '2027-01-12',
      graduatingHeadcount: 20,
      projectedGraduatingHeadcount: 18,
      trainingFalloutHeadcount: 2
    })
  })
})
