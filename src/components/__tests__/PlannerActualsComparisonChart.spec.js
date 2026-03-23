import { mount } from '@vue/test-utils'

import PlannerActualsComparisonChart from '../planner/PlannerActualsComparisonChart.vue'

describe('PlannerActualsComparisonChart', () => {
  it('renders the full-year planned line without crashing when no actuals exist', () => {
    const wrapper = mount(PlannerActualsComparisonChart, {
      props: {
        records: [
          {
            monthIndex: 0,
            label: 'Jan',
            fullLabel: 'January',
            actualRequiredHeadcount: null,
            plannedRequiredHeadcount: 10.2
          },
          {
            monthIndex: 1,
            label: 'Feb',
            fullLabel: 'February',
            actualRequiredHeadcount: null,
            plannedRequiredHeadcount: 11.1
          }
        ],
        formatNumber: (value) => Number(value ?? 0).toFixed(1)
      }
    })

    expect(wrapper.text()).toContain('Planned Req HC')
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.findAll('circle').length).toBe(2)
  })
})
