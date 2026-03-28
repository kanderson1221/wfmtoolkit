<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { mdiEyeOffOutline, mdiEyeOutline } from '@mdi/js'

import { isSupabaseConfigured, supabase, supabaseConfigError } from '../supabaseClient'
import AppIcon from './ui/AppIcon.vue'
import AppButton from './ui/AppButton.vue'
import AppDialog from './ui/AppDialog.vue'
import AppFieldGroup from './ui/AppFieldGroup.vue'
import AppStatusMessage from './ui/AppStatusMessage.vue'
import AppTextField from './ui/AppTextField.vue'

const props = defineProps({
  authConfigured: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const visible = defineModel('visible', {
  type: Boolean,
  required: true
})

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

const authAvailable = computed(() => props.authConfigured && isSupabaseConfigured)

const formTitle = computed(() => (mode.value === 'sign-in' ? 'Sign In' : 'Register'))
const formDescription = computed(() =>
  mode.value === 'sign-in'
    ? 'Sign in when you want planning data saved to your account instead of only this browser.'
    : 'Create an account to back up planning work and reopen it from any signed-in session.'
)

const clearErrors = (errors) => {
  Object.keys(errors).forEach((key) => {
    errors[key] = ''
  })
}

const clearStatus = () => {
  statusMessage.value = ''
  statusTone.value = 'success'
}

const resetTransientState = () => {
  authBusy.value = false
  clearStatus()
  clearErrors(signInErrors)
  clearErrors(registerErrors)
}

const closeDialog = () => {
  visible.value = false
}

const focusActiveEmailField = async () => {
  if (!visible.value || !authAvailable.value) {
    return
  }

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
  resetTransientState()
}

const getAuthModeButtonClass = (targetMode) => (
  mode.value === targetMode
    ? 'border-[#c6d4e3] bg-[#e7eef4] text-[#173b5d] shadow-sm hover:border-[#bdcddd] hover:bg-[#dfe8f1]'
    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#c6d4e3] hover:bg-[#f3f6f9] hover:text-slate-900'
)

const buildAuthRedirectUrl = () => {
  const currentHash = window.location.hash && window.location.hash !== '#home'
    ? window.location.hash
    : '#planning'

  return `${window.location.origin}${window.location.pathname}${currentHash}`
}

const submitSignIn = async () => {
  clearStatus()

  if (!authAvailable.value || !supabase) {
    statusTone.value = 'error'
    statusMessage.value = authAvailable.value ? supabaseConfigError : 'Account sync is unavailable in this environment.'
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
  statusMessage.value = 'Signed in. Opening your account-backed workspace...'
}

const submitRegister = async () => {
  clearStatus()

  if (!authAvailable.value || !supabase) {
    statusTone.value = 'error'
    statusMessage.value = authAvailable.value ? supabaseConfigError : 'Account sync is unavailable in this environment.'
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
      emailRedirectTo: buildAuthRedirectUrl()
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
    ? 'Account created. Opening your account-backed workspace...'
    : 'Account created. Check your email to confirm your registration before signing in.'
}

const submitPasswordReset = async () => {
  clearStatus()

  if (!authAvailable.value || !supabase) {
    statusTone.value = 'error'
    statusMessage.value = authAvailable.value ? supabaseConfigError : 'Account sync is unavailable in this environment.'
    return
  }

  if (!validateEmail(signInForm.email)) {
    clearErrors(signInErrors)
    signInErrors.email = 'Enter your work email before requesting a reset.'
    statusTone.value = 'error'
    statusMessage.value = 'Enter the email address for the account you want to reset.'
    return
  }

  authBusy.value = true

  const { error } = await supabase.auth.resetPasswordForEmail(signInForm.email.trim(), {
    redirectTo: buildAuthRedirectUrl()
  })

  authBusy.value = false

  if (error) {
    statusTone.value = 'error'
    statusMessage.value = error.message
    return
  }

  statusTone.value = 'success'
  statusMessage.value = 'Password reset email sent. Check your inbox for the reset link.'
}

const handleDialogClose = () => {
  resetTransientState()
  emit('close')
}

watch(mode, () => {
  void focusActiveEmailField()
})

watch(visible, (isVisible) => {
  if (isVisible) {
    void focusActiveEmailField()
    return
  }

  resetTransientState()
})
</script>

<template>
  <AppDialog
    v-model:visible="visible"
    kicker="Account Storage"
    title="Save Planning Data to Your Account"
    description="Planning stays available in guest mode. Sign in only if you want planning data backed up to your account."
    max-width="max-w-xl"
    allow-backdrop-close
    @close="handleDialogClose"
  >
    <div class="grid gap-4">
      <AppStatusMessage :tone="authAvailable ? 'info' : 'error'">
        {{
          authAvailable
            ? 'Guest mode keeps planning data in this browser. Sign in to save new planning changes to your account.'
            : supabaseConfigError
        }}
      </AppStatusMessage>

      <div v-if="authAvailable" class="grid gap-4">
        <div class="grid gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-1.5 sm:grid-cols-2">
          <AppButton
            variant="quiet"
            block
            :class="getAuthModeButtonClass('sign-in')"
            @click="switchMode('sign-in')"
          >
            Sign In
          </AppButton>
          <AppButton
            variant="quiet"
            block
            :class="getAuthModeButtonClass('register')"
            @click="switchMode('register')"
          >
            Register
          </AppButton>
        </div>

        <div class="grid gap-1">
          <h2 class="text-xl font-semibold tracking-[-0.03em] text-slate-950">
            {{ formTitle }}
          </h2>
          <p class="text-sm leading-6 text-slate-600">
            {{ formDescription }}
          </p>
        </div>

        <AppStatusMessage v-if="statusMessage" :tone="statusTone">
          {{ statusMessage }}
        </AppStatusMessage>

        <form
          v-if="mode === 'sign-in'"
          class="grid gap-5"
          novalidate
          @submit.prevent="submitSignIn"
        >
          <AppFieldGroup
            label="Work Email"
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
              <AppButton
                variant="quiet"
                size="sm"
                @click="submitPasswordReset"
              >
                Reset password
              </AppButton>
            </template>

            <div class="relative">
              <AppTextField
                id="sign-in-password"
                v-model="signInForm.password"
                :type="signInForm.showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Enter your password"
                class="pr-12"
                :aria-invalid="signInErrors.password ? 'true' : 'false'"
              />
              <button
                type="button"
                class="absolute top-1/2 right-3 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-slate-400 transition hover:bg-transparent hover:text-[#173b5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
                :aria-label="signInForm.showPassword ? 'Hide password' : 'Show password'"
                @click="signInForm.showPassword = !signInForm.showPassword"
              >
                <AppIcon :path="signInForm.showPassword ? mdiEyeOffOutline : mdiEyeOutline" :size="18" />
              </button>
            </div>
          </AppFieldGroup>

          <AppButton
            type="submit"
            variant="primary"
            block
            :disabled="authBusy || !authAvailable"
          >
            {{ authBusy ? 'Signing In...' : 'Sign In' }}
          </AppButton>
        </form>

        <form
          v-else
          class="grid gap-5"
          novalidate
          @submit.prevent="submitRegister"
        >
          <AppFieldGroup
            label="Work Email"
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
            label="Create Password"
            input-id="register-password"
            help-text="Use at least 12 characters."
            :error="registerErrors.password"
          >
            <div class="relative">
              <AppTextField
                id="register-password"
                v-model="registerForm.password"
                :type="registerForm.showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="12"
                placeholder="Use at least 12 characters"
                class="pr-12"
                :aria-invalid="registerErrors.password ? 'true' : 'false'"
              />
              <button
                type="button"
                class="absolute top-1/2 right-3 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-slate-400 transition hover:bg-transparent hover:text-[#173b5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
                :aria-label="registerForm.showPassword ? 'Hide password' : 'Show password'"
                @click="registerForm.showPassword = !registerForm.showPassword"
              >
                <AppIcon :path="registerForm.showPassword ? mdiEyeOffOutline : mdiEyeOutline" :size="18" />
              </button>
            </div>
          </AppFieldGroup>

          <AppFieldGroup
            label="Confirm Password"
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

          <AppButton
            type="submit"
            variant="primary"
            block
            :disabled="authBusy || !authAvailable"
          >
            {{ authBusy ? 'Creating Account...' : 'Register' }}
          </AppButton>
        </form>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <AppButton variant="secondary" @click="closeDialog">
          Close
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
