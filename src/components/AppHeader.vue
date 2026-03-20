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
  <header class="sticky top-0 z-[60] border-b border-slate-900/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(18,52,86,0.96))] shadow-[0_14px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl">
    <div class="app-frame flex min-h-[78px] items-center gap-4 px-2">
      <a href="#home" class="inline-flex items-center" aria-label="WFMToolkit home">
        <img :src="logoUrl" alt="WFMToolkit logo" class="block h-[3.15rem] w-auto" />
      </a>

      <div class="ml-auto flex items-center gap-2.5">
        <span
          v-if="!props.isAuthenticated && props.authConfigured"
          class="rounded-2xl border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-100"
        >
          Sign in required
        </span>

        <span
          v-else-if="!props.isAuthenticated"
          class="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-amber-100"
        >
          Auth setup needed
        </span>

        <template v-else>
          <AppMenu
            :items="menuItems"
            :active-id="props.currentApp"
            :trigger-icon="mdiMenu"
            trigger-variant="icon-inverse"
            trigger-label="Open navigation menu"
            @select="handleMenuItemClick"
          />
        </template>
      </div>
    </div>
  </header>
</template>
