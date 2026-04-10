import 'fake-indexeddb/auto'

import { defineComponent, h } from 'vue'
import { config } from '@vue/test-utils'
import { afterEach, vi } from 'vitest'

import { installPrimeVue } from '../plugins/primevue'
import { clearLocalDataStore } from '../storage/localDataStore'
import { wfmDexie } from '../storage/wfmDexie'

vi.mock('vue-echarts', () => ({
  default: defineComponent({
    name: 'MockVueECharts',
    props: {
      option: {
        type: Object,
        default: () => ({})
      },
      updateOptions: {
        type: Object,
        default: () => ({})
      },
      autoresize: {
        type: [Boolean, Object],
        default: false
      }
    },
    setup(_props, { attrs, slots }) {
      return () =>
        h(
          'div',
          {
            ...attrs,
            'data-testid': 'mock-echart'
          },
          slots.default ? slots.default() : []
        )
    }
  })
}))

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    }
  })
}

if (typeof globalThis !== 'undefined' && !globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

afterEach(async () => {
  await clearLocalDataStore().catch(() => {})
  wfmDexie.close()
})

config.global.plugins = [
  {
    install: installPrimeVue
  }
]
