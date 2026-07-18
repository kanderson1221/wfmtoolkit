import { describe, expect, it } from 'vitest'

import { buildPortfolioMonthlyCsv } from '../portfolioCsv'

describe('portfolioCsv', () => {
  it('exports self-describing monthly staffing decisions without inventing missing actuals', () => {
    const csv = buildPortfolioMonthlyCsv({
      planningYear: 2027,
      planRole: 'current',
      groupCount: 3,
      monthlyRows: [
        {
          monthStart: '2027-01-01',
          monthLabel: 'Jan 2027',
          groupsPlannedCount: 2,
          groupsWithActualsCount: 0,
          expectedContacts: 12000,
          actualContacts: null,
          contactVariance: null,
          expectedAhtSeconds: 360,
          actualAhtSeconds: null,
          expectedWorkloadHours: 1200,
          actualWorkloadHours: null,
          requiredStaffHours: 1800,
          requiredHeadcount: 12.3456789,
          peakRequiredHeadcount: 14,
          actualRequiredHeadcount: null,
          requiredHeadcountVariance: null,
          startingFrontlineHeadcount: 11,
          hireHeadcount: 2,
          frontlineReadyHeadcount: 1.6,
          frontlineAttritionHeadcount: 1,
          endingFrontlineHeadcount: 11.6,
          endingRosterHeadcount: 13.6,
          gapToRequirement: -0.7456789,
          gapVsActualRequiredHeadcount: null,
          isBelowRequirement: true,
          daysLoaded: 0
        }
      ]
    })
    const [header, january] = csv.split('\r\n')

    expect(header).toContain('planning_year,plan_role,month_start,month')
    expect(header).toContain('required_headcount,peak_required_headcount,actual_required_headcount')
    expect(header).toContain('starting_frontline_headcount')
    expect(header).toContain('ending_frontline_headcount,ending_roster_headcount')
    expect(january).toContain('2027,current,2027-01-01,Jan 2027,2,3,0,12000,,,360,,1200,,1800,12.345679,14,,')
    expect(january).toContain('11,2,1.6,1,11.6,13.6,-0.745679,,yes,0')
  })
})
