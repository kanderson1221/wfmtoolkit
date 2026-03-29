import { mount } from '@vue/test-utils'

const { signInWithPassword, signUp, resetPasswordForEmail, resend } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn()
}))

vi.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword,
      signUp,
      resetPasswordForEmail,
      resend
    }
  },
  supabaseConfigError: 'Missing Supabase config.'
}))

import AppAccountDialog from '../AppAccountDialog.vue'

const DialogStub = {
  name: 'Dialog',
  props: ['visible'],
  emits: ['hide', 'update:visible'],
  template: '<div class="dialog-stub"><slot name="header" /><slot /><slot name="footer" /></div>'
}

const mountDialog = (props = {}) =>
  mount(AppAccountDialog, {
    props: {
      visible: true,
      authConfigured: true,
      ...props
    },
    global: {
      stubs: {
        Dialog: DialogStub
      }
    }
  })

describe('AppAccountDialog', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
    signUp.mockReset()
    resetPasswordForEmail.mockReset()
    resend.mockReset()
  })

  it('shows the guest storage message alongside the sign-in form', () => {
    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Save Planning Data to Your Account')
    expect(wrapper.text()).toContain('Guest mode keeps planning data in this browser.')
    expect(wrapper.text()).toContain('Sign In')
  })

  it('shows validation messaging on invalid sign-in submit', async () => {
    const wrapper = mountDialog()

    await wrapper.get('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Check the highlighted fields and try again.')
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('switches into register mode', async () => {
    const wrapper = mountDialog()
    const registerButton = wrapper.findAll('button').find((button) => button.text() === 'Register')

    expect(registerButton).toBeTruthy()
    await registerButton.trigger('click')

    expect(wrapper.text()).toContain('Create an account to back up planning work and reopen it from any signed-in session.')
    expect(wrapper.text()).toContain('Confirm Password')
  })

  it('sends a reset password request when a valid email is entered', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null })

    const wrapper = mountDialog()

    await wrapper.get('#sign-in-email').setValue('planner@example.com')
    await wrapper.findAll('button').find((button) => button.text() === 'Reset password').trigger('click')

    expect(resetPasswordForEmail).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Password reset email sent.')
  })

  it('offers to resend confirmation after register succeeds without a session', async () => {
    signUp.mockResolvedValue({
      data: {
        session: null
      },
      error: null
    })
    resend.mockResolvedValue({ error: null })

    const wrapper = mountDialog()
    const registerButton = wrapper.findAll('button').find((button) => button.text() === 'Register')

    await registerButton.trigger('click')
    await wrapper.get('#register-email').setValue('planner@example.com')
    await wrapper.get('#register-password').setValue('averysecurepass')
    await wrapper.get('#register-confirm-password').setValue('averysecurepass')
    await wrapper.get('form').trigger('submit.prevent')

    expect(signUp).toHaveBeenCalledWith({
      email: 'planner@example.com',
      password: 'averysecurepass',
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}#planning`
      }
    })
    expect(wrapper.text()).toContain('If no email arrives')
    expect(wrapper.text()).toContain('Resend Confirmation Email')

    await wrapper.findAll('button').find((button) => button.text() === 'Resend Confirmation Email').trigger('click')

    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'planner@example.com',
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}#planning`
      }
    })
    expect(wrapper.text()).toContain('Confirmation email sent.')
  })

  it('shows the config error when account sync is unavailable', () => {
    const wrapper = mount(AppAccountDialog, {
      props: {
        visible: true,
        authConfigured: false
      },
      global: {
        stubs: {
          Dialog: DialogStub
        }
      }
    })

    expect(wrapper.text()).toContain('Missing Supabase config.')
    expect(wrapper.text()).not.toContain('Work Email')
  })
})
