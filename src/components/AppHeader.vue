<script setup>
import { computed, ref } from 'vue'
import {
  mdiBriefcaseOutline,
  mdiCalculatorVariantOutline,
  mdiHomeOutline,
  mdiLogout,
  mdiMenu
} from '@mdi/js'
import Menu from 'primevue/menu'

import logoUrl from '../assets/logo.svg'
import AppIcon from './ui/AppIcon.vue'
import AppIconButton from './ui/AppIconButton.vue'
import { menuPanelPt } from './ui/primevuePresets'

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

const menuRef = ref(null)

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

const toggleMenu = (event) => {
  menuRef.value?.toggle(event)
}

const closeMenu = () => {
  menuRef.value?.hide?.()
}

const handleMenuItemClick = (item) => {
  closeMenu()

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
          <AppIconButton
            :icon="mdiMenu"
            label="Open navigation menu"
            @click="toggleMenu"
          />

          <Menu
            ref="menuRef"
            popup
            :model="menuItems"
            :pt="menuPanelPt"
          >
            <template #item="{ item, props: menuItemProps }">
              <button
                v-bind="menuItemProps.action"
                type="button"
                class="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition"
                :class="
                  item.tone === 'danger'
                    ? 'border border-transparent text-rose-700 hover:border-rose-100 hover:bg-rose-50'
                    : props.currentApp === item.id
                      ? 'border border-sky-100 bg-sky-50 text-sky-800'
                      : 'border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                "
                @click="handleMenuItemClick(item)"
              >
                <AppIcon :path="item.icon" class="h-5 w-5 shrink-0" />
                <span class="flex-1">{{ item.label }}</span>
              </button>
            </template>
          </Menu>
        </template>
      </div>
    </div>
  </header>
</template>
