import { mount } from '@vue/test-utils'

import PlannerTrainingPipelineTable from '../planner/PlannerTrainingPipelineTable.vue'

describe('PlannerTrainingPipelineTable', () => {
  it('marks invalid calendar hire dates without displaying normalized derived dates', async () => {
    const wrapper = mount(PlannerTrainingPipelineTable, {
      props: {
        planningYear: 2026,
        trainingSettings: {
          trainingDurationWorkdays: 5,
          postTrainingNestingDays: 0,
          graduationYieldPercent: 100,
          availableTrainers: 1,
          maxClassSize: 10,
          startOnFirstBusinessDayOfWeek: true
        },
        trainingClasses: [
          {
            id: 'invalid-date-class',
            hireDate: '2026-02-30',
            hireCount: 10,
            source: 'manual'
          }
        ],
        selectedMonthIndex: 2,
        formatNumber: (value) => Number(value ?? 0).toFixed(1)
      },
      global: {
        stubs: {
          AppButton: true,
          AppIcon: true,
          AppMenu: true,
          AppTableDateField: {
            props: ['modelValue'],
            template: '<input type="date" :value="modelValue" />'
          },
          AppTableNumberField: {
            props: ['modelValue', 'min', 'step'],
            template: '<input :value="modelValue" />'
          }
        }
      }
    })

    await wrapper.find('button.training-pipeline-toggle').trigger('click')

    expect(wrapper.text()).toContain('Invalid Dates')
    expect(wrapper.text()).not.toContain('Mar 2')
    expect(wrapper.find('input[type="date"]').element.value).toBe('')
  })

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
            props: ['variant'],
            template: '<button :data-variant="variant"><slot /></button>'
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
    expect(wrapper.find('button[data-variant="primary"]').text()).toContain('Add Training Class')
    expect(wrapper.text()).toContain('Inherited from 2026 plan')
    expect(wrapper.text()).toContain('Read only')
    expect(wrapper.findAll('tbody input').length).toBe(2)
    const dateInput = wrapper.find('input[type="date"]')
    expect(dateInput.attributes('min')).toBe('2027-01-01')
    expect(dateInput.attributes('max')).toBe('2027-12-31')
  })

  it('allows read-only plans to expand classes without exposing edit actions', async () => {
    const wrapper = mount(PlannerTrainingPipelineTable, {
      props: {
        readOnly: true,
        planningYear: 2027,
        trainingSettings: {
          trainingDurationWorkdays: 10,
          postTrainingNestingDays: 5,
          graduationYieldPercent: 90,
          availableTrainers: 1,
          maxClassSize: 10,
          startOnFirstBusinessDayOfWeek: true
        },
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
            props: ['variant'],
            template: '<button :data-variant="variant"><slot /></button>'
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

    expect(wrapper.find('#training-pipeline-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Feb 3')
    expect(wrapper.text()).toContain('12.0')
    expect(wrapper.text()).toContain('Read only')
    expect(wrapper.text()).not.toContain('Add Training Class')
    expect(wrapper.text()).not.toContain('Recommend Classes')
    expect(wrapper.findAll('tbody input')).toHaveLength(0)
  })
})
