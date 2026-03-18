<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'

import { isSupabaseConfigured, supabase, supabaseConfigError } from '../supabaseClient'
import AppButton from './ui/AppButton.vue'
import AppFieldGroup from './ui/AppFieldGroup.vue'
import AppPageHeader from './ui/AppPageHeader.vue'
import AppPanel from './ui/AppPanel.vue'
import AppStatusMessage from './ui/AppStatusMessage.vue'
import AppTextField from './ui/AppTextField.vue'

const mode = ref('sign-in')
const statusMessage = ref('')
const statusTone = ref('success')
const authBusy = ref(false)

const signInEmailRef = ref(null)
const registerEmailRef = ref(null)

const signInForm = reactive({
  email: '',
  password: '',
  showPassword: false
})

const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  showPassword: false
})

const signInErrors = reactive({
  email: '',
  password: ''
})

const registerErrors = reactive({
  email: '',
  password: '',
  confirmPassword: ''
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const authTitle = computed(() =>
  mode.value === 'sign-in' ? 'Sign in to WFM Toolkit' : 'Create your WFM Toolkit account'
)

const authDescription = computed(() =>
  mode.value === 'sign-in'
    ? 'Use your work email and password to access workforce planning tools and saved staffing groups.'
    : 'Register with your work email to create a workspace for call centers, staffing groups, and calculator tools.'
)

const authNoteTone = computed(() => (isSupabaseConfigured ? 'success' : 'error'))

const clearErrors = (errors) => {
  Object.keys(errors).forEach((key) => {
    errors[key] = ''
  })
}

const clearStatus = () => {
  statusMessage.value = ''
  statusTone.value = 'success'
}

const focusActiveEmailField = async () => {
  await nextTick()
  const target = mode.value === 'sign-in' ? signInEmailRef.value : registerEmailRef.value
  target?.focus?.()
}

const validateEmail = (value) => emailPattern.test(value.trim())

const validateSignIn = () => {
  clearErrors(signInErrors)
  let valid = true

  if (!validateEmail(signInForm.email)) {
    signInErrors.email = 'Enter a valid work email address.'
    valid = false
  }

  if (!signInForm.password) {
    signInErrors.password = 'Enter your password.'
    valid = false
  }

  return valid
}

const validateRegister = () => {
  clearErrors(registerErrors)
  let valid = true

  if (!validateEmail(registerForm.email)) {
    registerErrors.email = 'Enter a valid work email address.'
    valid = false
  }

  if (registerForm.password.length < 12) {
    registerErrors.password = 'Use at least 12 characters for a stronger password.'
    valid = false
  }

  if (registerForm.confirmPassword !== registerForm.password) {
    registerErrors.confirmPassword = 'Passwords must match.'
    valid = false
  }

  return valid
}

const switchMode = (nextMode) => {
  mode.value = nextMode
  clearStatus()
}

const submitSignIn = async () => {
  clearStatus()

  if (!isSupabaseConfigured || !supabase) {
    statusTone.value = 'error'
    statusMessage.value = supabaseConfigError
    return
  }

  if (!validateSignIn()) {
    statusTone.value = 'error'
    statusMessage.value = 'Check the highlighted fields and try again.'
    return
  }

  authBusy.value = true

  const { error } = await supabase.auth.signInWithPassword({
    email: signInForm.email.trim(),
    password: signInForm.password
  })

  authBusy.value = false

  if (error) {
    statusTone.value = 'error'
    statusMessage.value = error.message
    return
  }

  statusTone.value = 'success'
  statusMessage.value = 'Signed in. Redirecting to your workspace...'
}

const submitRegister = async () => {
  clearStatus()

  if (!isSupabaseConfigured || !supabase) {
    statusTone.value = 'error'
    statusMessage.value = supabaseConfigError
    return
  }

  if (!validateRegister()) {
    statusTone.value = 'error'
    statusMessage.value = 'Review the highlighted registration fields and try again.'
    return
  }

  authBusy.value = true

  const { data, error } = await supabase.auth.signUp({
    email: registerForm.email.trim(),
    password: registerForm.password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}#home`
    }
  })

  authBusy.value = false

  if (error) {
    statusTone.value = 'error'
    statusMessage.value = error.message
    return
  }

  statusTone.value = 'success'
  statusMessage.value = data.session
    ? 'Account created. Redirecting to your workspace...'
    : 'Account created. Check your email to confirm your registration before signing in.'
}

const showResetNotice = () => {
  statusTone.value = 'error'
  statusMessage.value = 'Password reset is not wired yet. Entering real sign-in and registration now works.'
}

watch(mode, () => {
  focusActiveEmailField()
})

onMounted(() => {
  focusActiveEmailField()
})
</script>

<template>
  <section class="calculator-section py-8 md:py-12" aria-label="Login screen">
    <div class="app-frame">
      <div class="mx-auto flex min-h-[calc(100vh-12rem)] max-w-2xl items-center justify-center">
        <AppPanel class="w-full max-w-xl" :padded="false">
          <div class="grid gap-6 p-6 md:p-8">
            <AppPageHeader
              kicker="Workspace Access"
              :title="authTitle"
              :description="authDescription"
            />

            <AppStatusMessage
              v-if="statusMessage"
              :tone="statusTone"
            >
              {{ statusMessage }}
            </AppStatusMessage>

            <form
              v-if="mode === 'sign-in'"
              class="grid gap-5"
              novalidate
              @submit.prevent="submitSignIn"
            >
              <AppFieldGroup
                label="Work email"
                input-id="sign-in-email"
                :error="signInErrors.email"
              >
                <AppTextField
                  id="sign-in-email"
                  ref="signInEmailRef"
                  v-model.trim="signInForm.email"
                  type="email"
                  inputmode="email"
                  autocomplete="username"
                  autocapitalize="none"
                  spellcheck="false"
                  placeholder="name@company.com"
                  :aria-invalid="signInErrors.email ? 'true' : 'false'"
                />
              </AppFieldGroup>

              <AppFieldGroup
                label="Password"
                input-id="sign-in-password"
                :error="signInErrors.password"
              >
                <template #action>
                  <button
                    type="button"
                    class="text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                    @click="showResetNotice"
                  >
                    Forgot password?
                  </button>
                </template>

                <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <AppTextField
                    id="sign-in-password"
                    v-model="signInForm.password"
                    :type="signInForm.showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  :aria-invalid="signInErrors.password ? 'true' : 'false'"
                />
                  <AppButton
                    variant="secondary"
                    size="sm"
                    :aria-label="signInForm.showPassword ? 'Hide password' : 'Show password'"
                    @click="signInForm.showPassword = !signInForm.showPassword"
                  >
                    {{ signInForm.showPassword ? 'Hide' : 'Show' }}
                  </AppButton>
                </div>
              </AppFieldGroup>

              <div class="pt-1">
                <AppButton
                  type="submit"
                  variant="primary"
                  block
                  :disabled="authBusy || !isSupabaseConfigured"
                >
                  {{ authBusy ? 'Signing In...' : 'Sign In' }}
                </AppButton>
              </div>
            </form>

            <form
              v-else
              class="grid gap-5"
              novalidate
              @submit.prevent="submitRegister"
            >
              <AppFieldGroup
                label="Work email"
                input-id="register-email"
                :error="registerErrors.email"
              >
                <AppTextField
                  id="register-email"
                  ref="registerEmailRef"
                  v-model.trim="registerForm.email"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  autocapitalize="none"
                  spellcheck="false"
                  placeholder="name@company.com"
                  :aria-invalid="registerErrors.email ? 'true' : 'false'"
                />
              </AppFieldGroup>

              <AppFieldGroup
                label="Create password"
                input-id="register-password"
                help-text="Use a unique password with at least 12 characters."
                :error="registerErrors.password"
              >
                <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <AppTextField
                    id="register-password"
                    v-model="registerForm.password"
                    :type="registerForm.showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  minlength="12"
                  placeholder="Use at least 12 characters"
                  :aria-invalid="registerErrors.password ? 'true' : 'false'"
                />
                  <AppButton
                    variant="secondary"
                    size="sm"
                    :aria-label="registerForm.showPassword ? 'Hide password' : 'Show password'"
                    @click="registerForm.showPassword = !registerForm.showPassword"
                  >
                    {{ registerForm.showPassword ? 'Hide' : 'Show' }}
                  </AppButton>
                </div>
              </AppFieldGroup>

              <AppFieldGroup
                label="Confirm password"
                input-id="register-confirm-password"
                :error="registerErrors.confirmPassword"
              >
                <AppTextField
                  id="register-confirm-password"
                  v-model="registerForm.confirmPassword"
                  :type="registerForm.showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Re-enter your password"
                  :aria-invalid="registerErrors.confirmPassword ? 'true' : 'false'"
                />
              </AppFieldGroup>

              <div class="pt-1">
                <AppButton
                  type="submit"
                  variant="primary"
                  block
                  :disabled="authBusy || !isSupabaseConfigured"
                >
                  {{ authBusy ? 'Creating Account...' : 'Register' }}
                </AppButton>
              </div>
            </form>

            <AppStatusMessage :tone="authNoteTone">
              {{
                isSupabaseConfigured
                  ? 'Authentication is powered by Supabase email and password sign-in.'
                  : supabaseConfigError
              }}
            </AppStatusMessage>

            <p class="flex items-center justify-between gap-3 text-sm text-slate-600">
              <template v-if="mode === 'sign-in'">
                <span>Don't have an account?</span>
                <button
                  type="button"
                  class="font-semibold text-sky-700 transition hover:text-sky-800"
                  @click="switchMode('register')"
                >
                  Register
                </button>
              </template>
              <template v-else>
                <span>Already have an account?</span>
                <button
                  type="button"
                  class="font-semibold text-sky-700 transition hover:text-sky-800"
                  @click="switchMode('sign-in')"
                >
                  Sign in
                </button>
              </template>
            </p>
          </div>
        </AppPanel>
      </div>
    </div>
  </section>
</template>
