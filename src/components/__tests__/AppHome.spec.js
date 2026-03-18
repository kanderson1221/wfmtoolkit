import { mount } from '@vue/test-utils'

const { signInWithPassword, signUp } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn()
}))

vi.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword,
      signUp
    }
  },
  supabaseConfigError: 'Missing Supabase config.'
}))

import AppHome from '../AppHome.vue'

describe('AppHome', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
    signUp.mockReset()
  })

  it('shows validation messaging on invalid sign-in submit', async () => {
    const wrapper = mount(AppHome)

    await wrapper.get('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Check the highlighted fields and try again.')
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('switches into register mode', async () => {
    const wrapper = mount(AppHome)
    const registerButton = wrapper.findAll('button').find((button) => button.text() === 'Register')

    expect(registerButton).toBeTruthy()
    await registerButton.trigger('click')

    expect(wrapper.text()).toContain('Create your WFM Toolkit account')
    expect(wrapper.text()).toContain('Confirm password')
  })
})
