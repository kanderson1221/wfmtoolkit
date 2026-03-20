import {
  MONTH_LABELS,
  createPlanMonth,
  createRandomMonth,
  createStaffingMonth,
  createTrainingClass,
  createTrainingSettings
} from '../../plannerModel'
import { createPresenceMonthFromProfile } from './shared'

export const buildExamplePlannerState = (planningYear) => {
  const operatingWeekdays = [1, 2, 3, 4, 5]
  const monthlyProfiles = [
    { plannedTimeOffPercent: 7, unplannedTimeOffPercent: 3.2, leaveTimePercent: 0.8, meetingsPercent: 1.8, trainingPercent: 1.2, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 },
    { plannedTimeOffPercent: 7, unplannedTimeOffPercent: 3.2, leaveTimePercent: 0.8, meetingsPercent: 1.8, trainingPercent: 1.2, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 },
    { plannedTimeOffPercent: 8, unplannedTimeOffPercent: 3.4, leaveTimePercent: 0.9, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 },
    { plannedTimeOffPercent: 8, unplannedTimeOffPercent: 3.4, leaveTimePercent: 0.9, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.12 },
    { plannedTimeOffPercent: 9.5, unplannedTimeOffPercent: 3.6, leaveTimePercent: 1, meetingsPercent: 2, trainingPercent: 1.4, coachingPercent: 1.3, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.15 },
    { plannedTimeOffPercent: 10, unplannedTimeOffPercent: 3.8, leaveTimePercent: 1, meetingsPercent: 2, trainingPercent: 1.5, coachingPercent: 1.3, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.15 },
    { plannedTimeOffPercent: 12, unplannedTimeOffPercent: 4, leaveTimePercent: 1.2, meetingsPercent: 1.8, trainingPercent: 1.1, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.18 },
    { plannedTimeOffPercent: 12, unplannedTimeOffPercent: 4, leaveTimePercent: 1.2, meetingsPercent: 1.8, trainingPercent: 1.1, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.18 },
    { plannedTimeOffPercent: 9.5, unplannedTimeOffPercent: 3.6, leaveTimePercent: 1, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.14 },
    { plannedTimeOffPercent: 8.8, unplannedTimeOffPercent: 3.5, leaveTimePercent: 0.9, meetingsPercent: 1.9, trainingPercent: 1.3, coachingPercent: 1.2, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.14 },
    { plannedTimeOffPercent: 9.5, unplannedTimeOffPercent: 3.7, leaveTimePercent: 1.1, meetingsPercent: 2, trainingPercent: 1.4, coachingPercent: 1.3, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.16 },
    { plannedTimeOffPercent: 11.5, unplannedTimeOffPercent: 4.2, leaveTimePercent: 1.3, meetingsPercent: 2.2, trainingPercent: 1.5, coachingPercent: 1.4, paidBreaksHoursPerDay: 0.5, otherAwayHoursPerDay: 0.2 }
  ]

  const exampleContacts = [44000, 42500, 44800, 46200, 47800, 49900, 53100, 54800, 50500, 48200, 47100, 52800]
  const exampleAht = [315, 312, 310, 305, 302, 300, 298, 300, 304, 308, 312, 320]
  const exampleAttrition = [1.3, 1.3, 1.5, 1.5, 1.7, 1.7, 1.9, 1.9, 1.7, 1.7, 1.5, 1.5]

  return {
    operatingWeekdays,
    presenceMonths: monthlyProfiles.map((profile, monthIndex) =>
      createPresenceMonthFromProfile({
        year: planningYear,
        monthIndex,
        weekdays: operatingWeekdays,
        ...profile
      })
    ),
    randomDefaults: createRandomMonth({ occupancyPercent: 90, adherencePercent: 95 }),
    randomMonths: MONTH_LABELS.map(() => createRandomMonth({ occupancyPercent: 90, adherencePercent: 95 })),
    planMonths: MONTH_LABELS.map((_, index) =>
      createPlanMonth({
        contacts: exampleContacts[index],
        ahtSeconds: exampleAht[index]
      })
    ),
    trainingSettings: createTrainingSettings({
      trainingDurationWorkdays: 20,
      graduationYieldPercent: 85,
      availableTrainers: 2,
      maxClassSize: 12,
      postTrainingNestingDays: 5
    }),
    startingHeadcount: 52,
    startingFrontlineHeadcount: 52,
    staffingMonths: MONTH_LABELS.map((_, index) =>
      createStaffingMonth({
        frontlineAttritionHeadcount: exampleAttrition[index]
      })
    ),
    trainingClasses: [
      createTrainingClass({
        id: 'class-spring',
        hireDate: `${planningYear}-02-10`,
        hireCount: 8
      }),
      createTrainingClass({
        id: 'class-summer',
        hireDate: `${planningYear}-06-09`,
        hireCount: 10
      }),
      createTrainingClass({
        id: 'class-fall',
        hireDate: `${planningYear}-09-08`,
        hireCount: 9
      })
    ]
  }
}
