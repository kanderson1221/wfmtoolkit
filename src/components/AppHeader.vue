<script setup>
import { computed } from 'vue'
import {
  mdiBriefcaseOutline,
  mdiCalculatorVariantOutline,
  mdiHomeOutline,
  mdiLogout,
  mdiMenu
} from '@mdi/js'

import logoInverseUrl from '../assets/logo-inverse.svg'
import AppMenu from './ui/AppMenu.vue'

const props = defineProps({
  currentApp: {
    type: String,
    default: 'planning'
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

const sessionLabel = computed(() => {
  if (props.isAuthenticated) {
    return props.userEmail || 'Signed In'
  }

  return 'Local Data Storage'
})

const appLinks = computed(() => [
  {
    id: 'home',
    label: 'Home',
    icon: mdiHomeOutline
  },
  {
    id: 'planning',
    href: '#planning',
    label: 'Planning Workspace',
    icon: mdiBriefcaseOutline
  },
  {
    id: 'calculators',
    href: '#calculators/interval',
    label: 'Erlang Calculators',
    icon: mdiCalculatorVariantOutline
  }
])

const menuItems = computed(() => [
  ...appLinks.value,
  ...(props.isAuthenticated && !props.authBypassEnabled
    ? [
        {
          id: 'sign-out',
          label: 'Sign Out',
          icon: mdiLogout,
          tone: 'danger'
        }
      ]
    : [])
])

const openPublicHome = () => {
  window.location.hash = ''
}

const handleMenuItemClick = (item) => {
  if (item.id === 'home') {
    openPublicHome()
    return
  }

  if (item.id === 'sign-out') {
    emit('sign-out')
    return
  }

  if (item.href) {
    window.location.hash = item.href
  }
}
</script>

<template>
  <header class="sticky top-0 z-[60] border-b border-[#0d2742] bg-[#102f4f]">
    <div class="app-frame flex min-h-[72px] items-center gap-4">
      <a
        href="/"
        class="inline-flex items-center"
        aria-label="WFMToolkit home"
        @click.prevent="openPublicHome"
      >
        <img :src="logoInverseUrl" alt="WFMToolkit logo" class="block h-[2.45rem] w-auto" />
      </a>

      <div class="ml-auto flex items-center gap-2.5">
        <span
          class="max-w-[11rem] truncate rounded-2xl border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-100 sm:max-w-[16rem]"
        >
          {{ sessionLabel }}
        </span>

        <AppMenu
          :items="menuItems"
          :active-id="props.currentApp"
          :trigger-icon="mdiMenu"
          trigger-variant="icon-inverse"
          trigger-label="Open navigation menu"
          @select="handleMenuItemClick"
        />
      </div>
    </div>
  </header>
</template>
