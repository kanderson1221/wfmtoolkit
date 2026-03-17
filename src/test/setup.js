import { config } from '@vue/test-utils'

import { installPrimeVue } from '../plugins/primevue'

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

config.global.plugins = [
  {
    install: installPrimeVue
  }
]
