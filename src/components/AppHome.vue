<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../supabaseClient'

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

const statusClass = computed(() => ({
  'status-message': true,
  error: statusTone.value === 'error'
}))

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
  target?.focus()
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
  <section class="calculator-section home-page-shell home-auth-shell" aria-label="Login screen">
    <div class="app-frame">
      <div class="home-auth-layout">
        <section class="results-panel home-auth-card">
          <p
            v-if="statusMessage"
            :class="statusClass"
            :role="statusTone === 'error' ? 'alert' : 'status'"
            aria-live="polite"
          >
            {{ statusMessage }}
          </p>

          <form v-if="mode === 'sign-in'" class="home-auth-form" novalidate @submit.prevent="submitSignIn">
            <div class="home-auth-field">
              <label for="sign-in-email" class="home-auth-label">Work email</label>
              <input
                id="sign-in-email"
                ref="signInEmailRef"
                v-model="signInForm.email"
                type="email"
                inputmode="email"
                autocomplete="username"
                autocapitalize="none"
                spellcheck="false"
                placeholder="name@company.com"
                :aria-invalid="signInErrors.email ? 'true' : 'false'"
                :aria-describedby="signInErrors.email ? 'sign-in-email-error' : undefined"
              />
              <p v-if="signInErrors.email" id="sign-in-email-error" class="home-auth-error">
                {{ signInErrors.email }}
              </p>
            </div>

            <div class="home-auth-field">
              <div class="home-auth-label-row">
                <label for="sign-in-password" class="home-auth-label">Password</label>
                <button type="button" class="home-auth-link-btn" @click="showResetNotice">Forgot password?</button>
              </div>
              <div class="home-auth-password-row">
                <input
                  id="sign-in-password"
                  v-model="signInForm.password"
                  :type="signInForm.showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  :aria-invalid="signInErrors.password ? 'true' : 'false'"
                  :aria-describedby="signInErrors.password ? 'sign-in-password-error' : undefined"
                />
                <button
                  type="button"
                  class="secondary-btn home-auth-password-toggle"
                  :aria-label="signInForm.showPassword ? 'Hide password' : 'Show password'"
                  @click="signInForm.showPassword = !signInForm.showPassword"
                >
                  {{ signInForm.showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
              <p v-if="signInErrors.password" id="sign-in-password-error" class="home-auth-error">
                {{ signInErrors.password }}
              </p>
            </div>

            <div class="home-auth-actions">
              <button type="submit" class="submit-btn" :disabled="authBusy || !isSupabaseConfigured">
                {{ authBusy ? 'Signing In...' : 'Sign In' }}
              </button>
            </div>
          </form>

          <form v-else class="home-auth-form" novalidate @submit.prevent="submitRegister">
            <div class="home-auth-field">
              <label for="register-email" class="home-auth-label">Work email</label>
              <input
                id="register-email"
                ref="registerEmailRef"
                v-model="registerForm.email"
                type="email"
                inputmode="email"
                autocomplete="email"
                autocapitalize="none"
                spellcheck="false"
                placeholder="name@company.com"
                :aria-invalid="registerErrors.email ? 'true' : 'false'"
                :aria-describedby="registerErrors.email ? 'register-email-error' : undefined"
              />
              <p v-if="registerErrors.email" id="register-email-error" class="home-auth-error">
                {{ registerErrors.email }}
              </p>
            </div>

            <div class="home-auth-field">
              <label for="register-password" class="home-auth-label">Create password</label>
              <div class="home-auth-password-row">
                <input
                  id="register-password"
                  v-model="registerForm.password"
                  :type="registerForm.showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  minlength="12"
                  placeholder="Use at least 12 characters"
                  :aria-invalid="registerErrors.password ? 'true' : 'false'"
                  :aria-describedby="registerErrors.password ? 'register-password-error' : 'register-password-help'"
                />
                <button
                  type="button"
                  class="secondary-btn home-auth-password-toggle"
                  :aria-label="registerForm.showPassword ? 'Hide password' : 'Show password'"
                  @click="registerForm.showPassword = !registerForm.showPassword"
                >
                  {{ registerForm.showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
              <p id="register-password-help" class="helper-text">Use a unique password with at least 12 characters.</p>
              <p v-if="registerErrors.password" id="register-password-error" class="home-auth-error">
                {{ registerErrors.password }}
              </p>
            </div>

            <div class="home-auth-field">
              <label for="register-confirm-password" class="home-auth-label">Confirm password</label>
              <input
                id="register-confirm-password"
                v-model="registerForm.confirmPassword"
                :type="registerForm.showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Re-enter your password"
                :aria-invalid="registerErrors.confirmPassword ? 'true' : 'false'"
                :aria-describedby="registerErrors.confirmPassword ? 'register-confirm-password-error' : undefined"
              />
              <p
                v-if="registerErrors.confirmPassword"
                id="register-confirm-password-error"
                class="home-auth-error"
              >
                {{ registerErrors.confirmPassword }}
              </p>
            </div>

            <div class="home-auth-actions">
              <button type="submit" class="submit-btn" :disabled="authBusy || !isSupabaseConfigured">
                {{ authBusy ? 'Creating Account...' : 'Register' }}
              </button>
            </div>
          </form>

          <p class="helper-text home-auth-footer-note">
            {{ isSupabaseConfigured ? 'Authentication is powered by Supabase email and password sign-in.' : supabaseConfigError }}
          </p>

          <p class="home-auth-mode-link">
            <template v-if="mode === 'sign-in'">
              Don't have an account?
              <button type="button" class="home-auth-link-btn" @click="switchMode('register')">Register</button>
            </template>
            <template v-else>
              Already have an account?
              <button type="button" class="home-auth-link-btn" @click="switchMode('sign-in')">Sign in</button>
            </template>
          </p>
        </section>
      </div>
    </div>
  </section>
</template>
