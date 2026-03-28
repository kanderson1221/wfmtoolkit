import { scanFrontendFile } from '../../scripts/check-frontend-standards.mjs'

describe('frontend standards scanner', () => {
  it('allows PrimeVue imports inside the shared UI layer', () => {
    expect(
      scanFrontendFile('src/components/ui/AppButton.vue', "import PrimeButton from 'primevue/button'")
    ).toEqual([])
  })

  it('flags direct PrimeVue imports in feature files', () => {
    expect(
      scanFrontendFile('src/components/planning/PlanningHome.vue', "import Button from 'primevue/button'")
    ).toContain('src/components/planning/PlanningHome.vue:1 direct PrimeVue import outside wrapper layer')
  })

  it('flags browser-native confirm and prompt usage in feature files', () => {
    const violations = scanFrontendFile(
      'src/components/planning/PlanningHome.vue',
      'window.confirm("Delete?")\nprompt("Name")'
    )

    expect(violations).toContain(
      'src/components/planning/PlanningHome.vue:1 browser-native dialog "confirm" is not allowed; use shared dialog patterns'
    )
    expect(violations).toContain(
      'src/components/planning/PlanningHome.vue:2 browser-native dialog "prompt" is not allowed; use shared dialog patterns'
    )
  })

  it('flags PrimeVue pt usage outside the wrapper layer', () => {
    expect(
      scanFrontendFile('src/components/planning/PlanningHome.vue', '<PrimeDialog :pt="dialogPt" />')
    ).toContain('src/components/planning/PlanningHome.vue:1 PrimeVue pt usage outside wrapper layer')
  })

  it('flags legacy blue utility usage', () => {
    expect(
      scanFrontendFile('src/styles/layout.css', '.panel { @apply text-blue-600; }')
    ).toContain('src/styles/layout.css:1 legacy blue utility "text-blue-600"')
  })

  it('flags banned legacy semantic tokens', () => {
    expect(
      scanFrontendFile('src/components/planning/PlanningHome.vue', '<button class="submit-btn">Save</button>')
    ).toContain('src/components/planning/PlanningHome.vue:1 banned legacy token "submit-btn"')
  })
})
