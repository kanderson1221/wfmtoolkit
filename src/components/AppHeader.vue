<script setup>
import { computed } from 'vue'
import {
  mdiBriefcaseOutline,
  mdiCalculatorVariantOutline,
  mdiHomeOutline,
  mdiMenu
} from '@mdi/js'

import logoInverseUrl from '../assets/logo-inverse.svg'
import AppButton from './ui/AppButton.vue'
import AppMenu from './ui/AppMenu.vue'

const props = defineProps({
  currentApp: {
    type: String,
    default: 'planning'
  },
  currentTool: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['open-local-data-storage'])

const sessionLabel = computed(() => 'Local Data Storage')

const activeNavId = computed(() => {
  if (props.currentApp === 'planning') {
    return 'planning'
  }

  if (props.currentApp === 'calculators') {
    return 'erlang'
  }

  return props.currentApp
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
    id: 'erlang',
    href: '#calculators/interval',
    label: 'Erlang Calculators',
    icon: mdiCalculatorVariantOutline
  }
])

const menuItems = computed(() => [
  ...appLinks.value
])

const openPublicHome = () => {
  window.location.hash = ''
}

const handleMenuItemClick = (item) => {
  if (item.id === 'home') {
    openPublicHome()
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
        <AppButton
          size="sm"
          variant="secondary-inverse"
          class="max-w-[11rem] truncate sm:max-w-[16rem]"
          @click="emit('open-local-data-storage')"
        >
          {{ sessionLabel }}
        </AppButton>

        <AppMenu
          :items="menuItems"
          :active-id="activeNavId"
          :trigger-icon="mdiMenu"
          trigger-variant="icon-inverse"
          trigger-label="Open navigation menu"
          @select="handleMenuItemClick"
        />
      </div>
    </div>
  </header>
</template>
