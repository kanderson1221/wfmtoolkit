import { mount } from '@vue/test-utils'

import PlannerTrainingPipelineTable from '../planner/PlannerTrainingPipelineTable.vue'

describe('PlannerTrainingPipelineTable', () => {
  it('renders inherited carry-in rows as read-only while keeping current-plan rows editable', async () => {
    const wrapper = mount(PlannerTrainingPipelineTable, {
      props: {
        planningYear: 2027,
        trainingSettings: {
          trainingDurationWorkdays: 10,
          postTrainingNestingDays: 5,
          graduationYieldPercent: 90,
          availableTrainers: 1,
          maxClassSize: 10,
          startOnFirstBusinessDayOfWeek: true
        },
        inheritedTrainingClasses: [
          {
            id: 'carry-in-1',
            hireDate: '2026-12-18',
            hireCount: 20,
            source: 'inherited',
            inheritedFromPlanningYear: 2026,
            graduationDate: '2027-01-05',
            frontlineReadyDate: '2027-01-12',
            graduatingHeadcount: 20,
            projectedGraduatingHeadcount: 18,
            trainingFalloutHeadcount: 2
          }
        ],
        trainingClasses: [
          {
            id: 'class-1',
            hireDate: '2027-02-03',
            hireCount: 12,
            source: 'manual'
          }
        ],
        selectedMonthIndex: 0,
        formatNumber: (value) => Number(value ?? 0).toFixed(1)
      },
      global: {
        stubs: {
          AppButton: {
            template: '<button><slot /></button>'
          },
          AppIcon: true,
          AppMenu: {
            template: '<button>Menu</button>'
          },
          AppTableDateField: {
            props: ['modelValue', 'min', 'max'],
            template: '<input type="date" :value="modelValue" :min="min" :max="max" />'
          },
          AppTableNumberField: {
            props: ['modelValue'],
            template: '<input :value="modelValue" />'
          }
        }
      }
    })

    await wrapper.find('button.training-pipeline-toggle').trigger('click')

    expect(wrapper.text()).toContain('Recommend Classes')
    expect(wrapper.text()).toContain('Inherited from 2026 plan')
    expect(wrapper.text()).toContain('Read only')
    expect(wrapper.findAll('tbody input').length).toBe(2)
    const dateInput = wrapper.find('input[type="date"]')
    expect(dateInput.attributes('min')).toBe('2027-01-01')
    expect(dateInput.attributes('max')).toBe('2027-12-31')
  })
})
