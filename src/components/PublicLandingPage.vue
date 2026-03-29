<script setup>
import { computed, ref } from 'vue'
import {
  mdiArrowRight
} from '@mdi/js'

import erlangToolImageUrl from '../assets/landing-erlang-tool.png'
import planningToolImageUrl from '../assets/landing-planning-tool.png'
import logoUrl from '../assets/logo.svg'
import AppAccountDialog from './AppAccountDialog.vue'
import AppButton from './ui/AppButton.vue'

const props = defineProps({
  authConfigured: {
    type: Boolean,
    default: false
  },
  isAuthenticated: {
    type: Boolean,
    default: false
  },
  userEmail: {
    type: String,
    default: ''
  }
})

const accountDialogOpen = ref(false)

const topNavLinks = [
  {
    id: 'planning-workspace',
    label: 'Planning Workspace'
  },
  {
    id: 'erlang-tools',
    label: 'Erlang Tools'
  }
]

const planningHighlights = [
  'Organize call centers, staffing groups, planning years, and plan records in one place.',
  'Build annual headcount plans with a traditional design factor approach.',
  'Keep maintained operating plans attached to the right staffing context.'
]

const erlangHighlights = [
  'Run Erlang C staffing checks quickly when a question needs a near-term answer.',
  'Test service level, occupancy, shrinkage, and volume assumptions before planning work begins.',
  'Use file-driven analysis when you need to review multiple scenarios together.'
]

const showSignInAction = computed(() => props.authConfigured && !props.isAuthenticated)

const openAccountDialog = () => {
  accountDialogOpen.value = true
}

const closeAccountDialog = () => {
  accountDialogOpen.value = false
}

const openPublicHome = () => {
  window.location.hash = ''
}

const scrollToSection = (sectionId) => {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}
</script>

<template>
  <div class="landing-shell">
    <header class="border-b border-slate-200 bg-white">
      <div class="app-frame landing-frame flex flex-col gap-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="/"
          class="inline-flex items-center text-slate-950 no-underline"
          aria-label="WFMToolkit landing page"
          @click.prevent="openPublicHome"
        >
          <img :src="logoUrl" alt="WFMToolkit logo" class="block h-[2.8rem] w-auto sm:h-[3.05rem]" />
        </a>

        <div class="flex flex-wrap items-center gap-2.5">
          <AppButton
            v-for="link in topNavLinks"
            :key="link.id"
            variant="quiet"
            size="sm"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm hover:border-[#c4d1de] hover:bg-slate-50 hover:text-[#15395f]"
            @click="scrollToSection(link.id)"
          >
            {{ link.label }}
          </AppButton>
          <AppButton
            v-if="showSignInAction"
            variant="quiet"
            size="sm"
            class="rounded-xl border border-[#c7d6e5] bg-[#e6edf4] px-3 py-2 text-[#15395f] shadow-sm hover:border-[#b9cada] hover:bg-[#dfe8f1]"
            @click="openAccountDialog"
          >
            Sign In
          </AppButton>
        </div>
      </div>
    </header>

    <main class="pb-16 lg:pb-20">
      <section class="app-frame landing-frame py-14 lg:py-18">
        <div class="rounded-[34px] border border-slate-200 bg-white px-6 py-9 shadow-[0_18px_44px_rgba(15,23,42,0.05)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div class="grid gap-8 lg:gap-10">
            <h1 class="text-[clamp(2.9rem,5.3vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950">
              Practical workforce planning tools, shared free.
            </h1>
            <p class="max-w-3xl text-[1.05rem] leading-8 text-slate-700">
              Built by a workforce manager, WFM Toolkit helps teams explore staffing scenarios, structure annual plans,
              and work through operational assumptions in one place.
            </p>
            <p class="max-w-3xl text-sm leading-7 text-slate-600">
              Outputs are intended for decision support and should be reviewed against your organization&apos;s real-world
              requirements and obligations.
            </p>
            <div class="flex flex-wrap items-center gap-3 pt-1">
              <AppButton
                href="#planning"
                variant="primary"
                size="lg"
                icon-position="right"
                :icon="mdiArrowRight"
                class="rounded-[1.1rem] px-5"
              >
                Open Planning Workspace
              </AppButton>
              <AppButton
                href="#calculators/interval"
                variant="secondary"
                size="lg"
                class="rounded-[1.1rem] border-slate-300 bg-white px-5 hover:border-[#c4d1de] hover:bg-slate-50"
              >
                Explore Erlang Tools
              </AppButton>
            </div>
          </div>
        </div>
      </section>

      <section id="planning-workspace" class="scroll-mt-28 border-t border-slate-200 bg-white">
        <div class="app-frame landing-frame grid gap-10 py-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center lg:gap-14 lg:py-18">
          <div class="grid gap-6">
            <h2 class="text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950">
              Planning Workspace
            </h2>
            <p class="max-w-xl text-[1rem] leading-8 text-slate-700">
              Build annual headcount plans utilizing a traditional design factor approach, with staffing groups,
              planning years, and plan records organized in one workspace.
            </p>
            <ul class="grid gap-3 text-sm leading-7 text-slate-600">
              <li
                v-for="highlight in planningHighlights"
                :key="highlight"
                class="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3.5"
              >
                {{ highlight }}
              </li>
            </ul>
            <div class="pt-1">
              <AppButton
                href="#planning"
                variant="primary"
                size="lg"
                icon-position="right"
                :icon="mdiArrowRight"
                class="rounded-[1.1rem] px-5"
              >
                Open Planning Workspace
              </AppButton>
            </div>
          </div>

          <div class="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-50 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
            <img
              :src="planningToolImageUrl"
              alt="Planning Workspace showing staffing groups and annual plans."
              class="block aspect-[16/10] w-full object-cover object-top"
              loading="lazy"
            />
            <div class="border-t border-slate-200 bg-white px-5 py-3 text-sm leading-6 text-slate-500">
              Built for maintained operating plans across call centers, staffing groups, and planning years.
            </div>
          </div>
        </div>
      </section>

      <section id="erlang-tools" class="scroll-mt-28 border-t border-slate-200">
        <div class="app-frame landing-frame grid gap-10 py-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-center lg:gap-14 lg:py-18">
          <div class="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-50 shadow-[0_24px_56px_rgba(15,23,42,0.08)] lg:order-1">
            <img
              :src="erlangToolImageUrl"
              alt="Erlang Tools showing interval staffing inputs and recommendation results."
              class="block aspect-[16/10] w-full object-cover object-top"
              loading="lazy"
            />
            <div class="border-t border-slate-200 bg-white px-5 py-3 text-sm leading-6 text-slate-500">
              Built for faster staffing checks, scenario testing, and file-driven analysis before work moves into planning.
            </div>
          </div>

          <div class="grid gap-6 lg:order-2">
            <h2 class="text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950">
              Erlang Tools
            </h2>
            <p class="max-w-xl text-[1rem] leading-8 text-slate-700">
              Run Erlang-based staffing checks, scenario testing, and file-driven analysis before the work needs to move
              into a maintained plan.
            </p>
            <ul class="grid gap-3 text-sm leading-7 text-slate-600">
              <li
                v-for="highlight in erlangHighlights"
                :key="highlight"
                class="rounded-[22px] border border-slate-200 bg-white px-4 py-3.5"
              >
                {{ highlight }}
              </li>
            </ul>
            <div class="pt-1">
              <AppButton
                href="#calculators/interval"
                variant="secondary"
                size="lg"
                icon-position="right"
                :icon="mdiArrowRight"
                class="rounded-[1.1rem] border-slate-300 bg-white px-5 hover:border-[#c4d1de] hover:bg-slate-50"
              >
                Explore Erlang Tools
              </AppButton>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-slate-200 bg-white">
      <div class="app-frame landing-frame flex flex-col gap-4 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>WFM Toolkit is built for practical workforce planning, staffing analysis, and operational decision support.</p>
        <div class="flex flex-wrap items-center gap-4">
          <a href="#planning" class="hover:text-[#173b5d]">Planning Workspace</a>
          <a href="#calculators/interval" class="hover:text-[#173b5d]">Erlang Tools</a>
        </div>
      </div>
    </footer>

    <AppAccountDialog
      v-if="showSignInAction"
      v-model:visible="accountDialogOpen"
      :auth-configured="props.authConfigured"
      @close="closeAccountDialog"
    />
  </div>
</template>

<style scoped>
.landing-shell {
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
}

.landing-frame {
  width: calc(100% - 2.5rem);
}

@media (min-width: 768px) {
  .landing-frame {
    width: calc(100% - 3.5rem);
  }
}

@media (min-width: 1280px) {
  .landing-frame {
    width: calc(100% - 5rem);
  }
}

@media (min-width: 1536px) {
  .landing-frame {
    width: calc(100% - 6rem);
  }
}
</style>
