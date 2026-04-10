<script setup>
import {
  mdiArrowRight
} from '@mdi/js'

import erlangToolImageUrl from '../assets/landing-erlang-tool.png'
import planningToolImageUrl from '../assets/landing-planning-tool.png'
import logoUrl from '../assets/logo.svg'
import AppButton from './ui/AppButton.vue'

const topNavLinks = [
  {
    id: 'planning-workspace',
    label: 'Planning Workspace'
  },
  {
    id: 'forecasting-workspace',
    label: 'Forecasting'
  },
  {
    id: 'erlang-tools',
    label: 'Erlang Calculators'
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

const forecastingHighlights = [
  'Open forecasting from inside each staffing group so the workspace starts with the right calendar and operating setup.',
  'Review daily demand, monthly rollups, components, and accuracy checks in one place.',
  'Carry saved forecast totals into Planning Workspace when monthly demand should come from a forecast.'
]

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
        </div>
      </div>
    </header>

    <main class="pb-16 lg:pb-20">
      <section class="app-frame landing-frame py-14 lg:py-18">
        <div class="grid max-w-[74rem] gap-7 lg:gap-8">
          <h1 class="max-w-6xl text-balance text-[clamp(2.9rem,5.3vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950">
            Practical workforce planning tools, shared
            <span class="text-[#15395f] underline decoration-[#15395f] decoration-[0.08em] underline-offset-[0.12em]">
              free.
            </span>
          </h1>
          <p class="max-w-4xl text-[1.05rem] leading-8 text-slate-700">
            Built by a workforce manager, WFM Toolkit is an independent project that helps teams explore staffing
            scenarios, produce demand forecasts, and structure annual plans in clearly separated workspaces.
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
              href="#planning"
              variant="secondary"
              size="lg"
              class="rounded-[1.1rem] border-slate-300 bg-white px-5 hover:border-[#c4d1de] hover:bg-slate-50"
            >
              Open Call Centers
            </AppButton>
            <AppButton
              href="#calculators/interval"
              variant="secondary"
              size="lg"
              class="rounded-[1.1rem] border-slate-300 bg-white px-5 hover:border-[#c4d1de] hover:bg-slate-50"
            >
              Open Erlang Calculators
            </AppButton>
          </div>
          <div class="grid max-w-4xl gap-2 border-l border-[#ccd7e2] pl-4">
            <p class="text-sm italic leading-6 text-slate-600">
              WFMToolkit is provided for decision support and estimation only. Results are estimates and are not
              guaranteed. Review and validate outputs against your own requirements, obligations, and operating
              context.
              (
              <a
                href="/terms/index.html"
                class="underline decoration-slate-400 underline-offset-2 transition hover:text-slate-700 hover:decoration-slate-500"
              >
                Terms
              </a>
              )
            </p>
            <p class="text-sm italic leading-6 text-slate-600">
              WFMToolkit does not use accounts or store planning data on a server. Your work stays in your browser.
            </p>
          </div>
        </div>
      </section>

      <section id="planning-workspace" class="scroll-mt-28 bg-white/82">
        <div class="app-frame landing-frame grid gap-10 py-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center lg:gap-14 lg:py-18">
          <div class="grid gap-6">
            <h2 class="text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950">
              Planning Workspace
            </h2>
            <p class="max-w-xl text-[1rem] leading-8 text-slate-700">
              Build annual headcount plans with staffing groups, planning years, and saved plan records organized in one
              workspace.
            </p>
            <ul class="grid divide-y divide-slate-200/80 text-sm leading-7 text-slate-600">
              <li
                v-for="highlight in planningHighlights"
                :key="highlight"
                class="flex gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                <span class="mt-3 h-px w-7 shrink-0 bg-[#9db0c4]" aria-hidden="true" />
                <span>{{ highlight }}</span>
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

      <section id="forecasting-workspace" class="scroll-mt-28 bg-slate-50/55">
        <div class="app-frame landing-frame grid gap-10 py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-14 lg:py-18">
          <div class="grid gap-6">
            <h2 class="text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950">
              Forecasting
            </h2>
            <p class="max-w-xl text-[1rem] leading-8 text-slate-700">
              Build daily demand forecasts inside each staffing group, then carry the monthly rollup into planning when
              the plan should follow forecasted volume.
            </p>
            <ul class="grid divide-y divide-slate-200/80 text-sm leading-7 text-slate-600">
              <li
                v-for="highlight in forecastingHighlights"
                :key="highlight"
                class="flex gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                <span class="mt-3 h-px w-7 shrink-0 bg-[#9db0c4]" aria-hidden="true" />
                <span>{{ highlight }}</span>
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
                Open Call Centers
              </AppButton>
            </div>
          </div>

          <div class="overflow-hidden rounded-[30px] border border-[#173b5d] bg-[#102f4f] text-white shadow-[0_24px_56px_rgba(15,23,42,0.18)]">
            <div class="grid gap-6 p-6 lg:p-7">
              <div class="grid gap-2">
                <span class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-300">Forecasting</span>
                <h3 class="text-[1.7rem] font-semibold leading-[1.03] tracking-[-0.04em]">
                  Daily forecasts that stay usable downstream.
                </h3>
                <p class="max-w-xl text-sm leading-7 text-slate-200">
                  Forecasts now live inside each staffing group so teams can model demand with the right operating days,
                  hours, holidays, and planning context already attached.
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-300">Daily Demand</div>
                  <div class="mt-2 text-lg font-semibold text-white">Forecast</div>
                  <p class="mt-2 text-sm leading-6 text-slate-200">Review history, forecast, and uncertainty in one charting workspace.</p>
                </div>
                <div class="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-300">Monthly Rollup</div>
                  <div class="mt-2 text-lg font-semibold text-white">Planning Ready</div>
                  <p class="mt-2 text-sm leading-6 text-slate-200">Carry forecasted monthly contacts into a plan when demand should come from a saved run.</p>
                </div>
                <div class="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div class="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-300">Accuracy</div>
                  <div class="mt-2 text-lg font-semibold text-white">Test Set</div>
                  <p class="mt-2 text-sm leading-6 text-slate-200">Score held-back days so the forecast can be reviewed before it moves into planning.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="erlang-tools" class="scroll-mt-28 bg-white/82">
        <div class="app-frame landing-frame grid gap-10 py-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-center lg:gap-14 lg:py-18">
          <div class="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-50 shadow-[0_24px_56px_rgba(15,23,42,0.08)] lg:order-1">
            <img
              :src="erlangToolImageUrl"
              alt="Erlang Calculators showing interval staffing inputs and recommendation results."
              class="block aspect-[16/10] w-full object-cover object-top"
              loading="lazy"
            />
            <div class="border-t border-slate-200 bg-white px-5 py-3 text-sm leading-6 text-slate-500">
              Built for faster staffing checks, scenario testing, and file-driven analysis before work moves into planning.
            </div>
          </div>

          <div class="grid gap-6 lg:order-2">
            <h2 class="text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950">
              Erlang Calculators
            </h2>
            <p class="max-w-xl text-[1rem] leading-8 text-slate-700">
              Run Erlang-based staffing checks, scenario testing, and file-driven analysis before work moves into a
              maintained plan.
            </p>
            <ul class="grid divide-y divide-slate-200/80 text-sm leading-7 text-slate-600">
              <li
                v-for="highlight in erlangHighlights"
                :key="highlight"
                class="flex gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                <span class="mt-3 h-px w-7 shrink-0 bg-[#9db0c4]" aria-hidden="true" />
                <span>{{ highlight }}</span>
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
                Open Erlang Calculators
              </AppButton>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="bg-white/88">
      <div class="app-frame landing-frame flex flex-col gap-4 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>Independent workforce planning and staffing tools built for practical analysis.</p>
        <div class="flex flex-wrap items-center gap-4">
          <a href="#planning" class="hover:text-[#173b5d]">Planning Workspace</a>
          <a href="#planning" class="hover:text-[#173b5d]">Forecasting In Call Centers</a>
          <a href="#calculators/interval" class="hover:text-[#173b5d]">Erlang Calculators</a>
          <a href="/terms/index.html" class="hover:text-[#173b5d]">Terms</a>
        </div>
      </div>
    </footer>

  </div>
</template>

<style scoped>
.landing-shell {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f8fb 0%, #ffffff 28%, #f7fafc 100%);
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
