<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import logoUrl from '../assets/logo.svg'

const props = defineProps({
  currentApp: {
    type: String,
    default: 'home'
  },
  isAuthenticated: {
    type: Boolean,
    default: false
  },
  userEmail: {
    type: String,
    default: ''
  },
  authConfigured: {
    type: Boolean,
    default: false
  },
  authBypassEnabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['sign-out'])

const menuOpen = ref(false)
const apiHealth = ref('checking')
let healthPoll = null

const appLinks = [
  {
    id: 'home',
    href: props.authBypassEnabled ? '#planning' : '#home',
    label: 'Home'
  },
  {
    id: 'calculators',
    href: '#calculators/interval',
    label: 'Calculator Suite'
  },
  {
    id: 'planning',
    href: '#planning',
    label: 'Planning App'
  }
]

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

const handleSignOut = () => {
  closeMenu()
  emit('sign-out')
}

const checkApiHealth = async () => {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' })
    if (!response.ok) {
      apiHealth.value = 'offline'
      return
    }

    const payload = await response.json().catch(() => null)
    apiHealth.value = payload?.status === 'ok' ? 'online' : 'degraded'
  } catch {
    apiHealth.value = 'offline'
  }
}

const apiHealthLabel = computed(() => {
  if (apiHealth.value === 'online') return 'Live'
  if (apiHealth.value === 'degraded') return 'Degraded'
  if (apiHealth.value === 'offline') return 'Offline'
  return 'Checking'
})

onMounted(() => {
  window.addEventListener('hashchange', closeMenu)
  checkApiHealth()
  healthPoll = window.setInterval(checkApiHealth, 45000)
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', closeMenu)
  if (healthPoll) {
    window.clearInterval(healthPoll)
  }
})
</script>

<template>
  <header class="site-header">
    <div class="container header-content">
      <a href="#home" class="brand-wrap" aria-label="WFMToolkit home">
        <img :src="logoUrl" alt="WFMToolkit logo" class="brand-logo" />
      </a>

      <div class="header-right">
        <div class="header-utilities">
          <span class="api-indicator" :class="`is-${apiHealth}`">API {{ apiHealthLabel }}</span>
          <span v-if="props.authBypassEnabled" class="auth-indicator auth-indicator-warning">Auth bypass active</span>
          <span v-if="props.isAuthenticated && props.userEmail" class="auth-indicator auth-indicator-user">
            {{ props.userEmail }}
          </span>
        </div>

        <nav v-if="props.isAuthenticated" class="site-nav" aria-label="Main navigation">
          <button
            class="nav-toggle"
            type="button"
            :aria-expanded="menuOpen ? 'true' : 'false'"
            aria-controls="main-nav-links"
            aria-label="Toggle navigation menu"
            @click="toggleMenu"
          >
            <span class="nav-toggle-label">Menu</span>
            <span class="nav-toggle-icon" aria-hidden="true">
              <span class="nav-toggle-bar"></span>
              <span class="nav-toggle-bar"></span>
              <span class="nav-toggle-bar"></span>
            </span>
          </button>

          <div id="main-nav-links" class="nav-links" :class="{ open: menuOpen }">
            <a
              v-for="link in appLinks"
              :key="link.id"
              :href="link.href"
              class="nav-link app-nav-link"
              :class="{ active: props.currentApp === link.id }"
              @click="closeMenu"
            >
              {{ link.label }}
            </a>

            <button v-if="!props.authBypassEnabled" type="button" class="nav-link nav-link-urgent" @click="handleSignOut">
              Sign Out
            </button>
          </div>
        </nav>

        <span v-else-if="props.authConfigured" class="auth-indicator">Sign in required</span>
        <span v-else class="auth-indicator auth-indicator-warning">Auth setup needed</span>
      </div>
    </div>
  </header>
</template>
