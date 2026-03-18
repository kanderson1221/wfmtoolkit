<script setup>
import { computed } from 'vue'
import {
  mdiBriefcaseOutline,
  mdiCalculatorVariantOutline,
  mdiHomeOutline,
  mdiLogout,
  mdiMenu
} from '@mdi/js'

import logoUrl from '../assets/logo.svg'
import AppMenu from './ui/AppMenu.vue'

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

const appLinks = computed(() => [
  {
    id: 'home',
    href: props.authBypassEnabled ? '#planning' : '#home',
    label: 'Home',
    icon: mdiHomeOutline
  },
  {
    id: 'calculators',
    href: '#calculators/interval',
    label: 'Calculator Suite',
    icon: mdiCalculatorVariantOutline
  },
  {
    id: 'planning',
    href: '#planning',
    label: 'Planning App',
    icon: mdiBriefcaseOutline
  }
])

const menuItems = computed(() => [
  ...appLinks.value,
  ...(props.authBypassEnabled
    ? []
    : [
        {
          id: 'sign-out',
          label: 'Sign Out',
          icon: mdiLogout,
          tone: 'danger'
        }
      ])
])

const handleMenuItemClick = (item) => {
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
  <header class="sticky top-0 z-[60] border-b border-slate-200 bg-white/95 backdrop-blur-xl">
    <div class="app-frame flex min-h-[74px] items-center gap-4 px-2">
      <a href="#home" class="inline-flex items-center" aria-label="WFMToolkit home">
        <img :src="logoUrl" alt="WFMToolkit logo" class="block h-14 w-auto" />
      </a>

      <div class="ml-auto flex items-center gap-2.5">
        <span
          v-if="!props.isAuthenticated && props.authConfigured"
          class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-600"
        >
          Sign in required
        </span>

        <span
          v-else-if="!props.isAuthenticated"
          class="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-amber-700"
        >
          Auth setup needed
        </span>

        <template v-else>
          <AppMenu
            :items="menuItems"
            :active-id="props.currentApp"
            :trigger-icon="mdiMenu"
            trigger-label="Open navigation menu"
            @select="handleMenuItemClick"
          />
        </template>
      </div>
    </div>
  </header>
</template>
