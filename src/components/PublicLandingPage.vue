<script setup>
import { mdiArrowRight } from '@mdi/js'

import erlangToolImageUrl from '../assets/landing-erlang-tool.png'
import planningToolImageUrl from '../assets/landing-planning-tool.png'
import logoUrl from '../assets/logo.svg'
import AppButton from './ui/AppButton.vue'

const topNavLinks = [
  { id: 'workflow', label: 'How It Works' },
  { id: 'forecasting-workspace', label: 'Forecasting' },
  { id: 'planning-workspace', label: 'Planning' },
  { id: 'actuals-workspace', label: 'Actuals' },
  { id: 'erlang-tools', label: 'Calculators' }
]

const workflowSteps = [
  {
    number: '01',
    title: 'Forecast demand',
    description: 'Build daily volume and AHT assumptions, review accuracy, and record manual changes.'
  },
  {
    number: '02',
    title: 'Translate demand',
    description: 'Apply availability, occupancy, adherence, and Erlang or workload-ratio requirement logic.'
  },
  {
    number: '03',
    title: 'Plan supply',
    description: 'Model hiring, training, attrition, and monthly frontline headcount against the requirement.'
  },
  {
    number: '04',
    title: 'Update with actuals',
    description: 'Actualize completed months, revise the forward view, and explain variance against plan.'
  }
]

const planningHighlights = [
  'Maintain budget baselines and traceable in-year updates by staffing group and planning year.',
  'Connect monthly requirements to starting supply, hiring, training, attrition, and ending gaps.',
  'Compare plan versions without losing the operating assumptions behind each decision.'
]

const forecastingHighlights = [
  'Review daily forecasts, monthly rollups, AHT assumptions, and held-out accuracy evidence together.',
  'Record range adjustments with dates, values, and an explicit planning reason.',
  'Apply a saved forecast directly to the correct staffing group and annual plan.'
]

const actualsHighlights = [
  'Load daily contacts and AHT once, with expected open-date coverage made visible.',
  'Compare planned and actual workload, requirement, and staffing position month by month.',
  'Create forward updates that use actuals for completed months and forecasts for the remaining year.'
]

const erlangHighlights = [
  'Run focused Erlang C staffing checks for service level, occupancy, and shrinkage questions.',
  'Inspect the recommendation curve instead of accepting a single unexplained answer.',
  'Use CSV-driven analysis when a larger scenario set needs consistent calculation.'
]

const heroMonths = [
  { month: 'May', required: '31.8', supply: '34.0', gap: '+2.2', tone: 'positive' },
  { month: 'Jun', required: '33.2', supply: '32.0', gap: '-1.2', tone: 'negative' },
  { month: 'Jul', required: '34.1', supply: '35.0', gap: '+0.9', tone: 'positive' },
  { month: 'Aug', required: '35.6', supply: '34.0', gap: '-1.6', tone: 'negative' }
]

const actualsRows = [
  { month: 'Jan', coverage: '22 / 22', plan: '28.4', actual: '29.1', variance: '+0.7' },
  { month: 'Feb', coverage: '20 / 20', plan: '29.2', actual: '28.5', variance: '-0.7' },
  { month: 'Mar', coverage: '22 / 22', plan: '30.1', actual: '31.3', variance: '+1.2' },
  { month: 'Apr', coverage: '21 / 21', plan: '31.0', actual: '30.6', variance: '-0.4' }
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
    <header class="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur">
      <div class="app-frame landing-frame flex items-center justify-between gap-5 py-4">
        <a
          href="/"
          class="inline-flex shrink-0 items-center text-slate-950 no-underline"
          aria-label="WFMToolkit landing page"
          @click.prevent="openPublicHome"
        >
          <img :src="logoUrl" alt="WFMToolkit logo" class="block h-8 w-auto sm:h-[2.9rem]" />
        </a>

        <nav class="hidden items-center gap-1 lg:flex" aria-label="Homepage sections">
          <button
            v-for="link in topNavLinks"
            :key="link.id"
            type="button"
            class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-[#15395f]"
            @click="scrollToSection(link.id)"
          >
            {{ link.label }}
          </button>
        </nav>

        <AppButton
          href="#planning"
          variant="primary"
          size="sm"
          icon-position="right"
          :icon="mdiArrowRight"
          class="shrink-0 rounded-xl"
        >
          Open Toolkit
        </AppButton>
      </div>
    </header>

    <main>
      <section class="landing-hero overflow-hidden">
        <div class="app-frame landing-frame grid gap-12 py-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(34rem,1.18fr)] lg:items-center lg:gap-16 lg:py-20">
          <div class="grid gap-7">
            <div class="grid gap-5">
              <p class="landing-kicker">Open workforce management software</p>
              <h1 class="max-w-4xl text-balance text-[clamp(3rem,5.6vw,5.35rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-slate-950">
                Practical workforce planning tools, shared
                <span class="text-[#15395f]">free.</span>
              </h1>
              <p class="max-w-2xl text-[1.08rem] leading-8 text-slate-700">
                Built by a workforce manager, WFM Toolkit is an independent project for forecasting demand,
                building annual staffing plans, evaluating actuals, and testing Erlang scenarios.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <AppButton
                href="#planning"
                variant="primary"
                size="lg"
                icon-position="right"
                :icon="mdiArrowRight"
                class="rounded-[1.1rem] px-5"
              >
                Start a Workforce Plan
              </AppButton>
              <AppButton
                href="#calculators/interval"
                variant="secondary"
                size="lg"
                class="rounded-[1.1rem] border-slate-300 bg-white px-5 hover:border-[#9fb2c5] hover:bg-slate-50"
              >
                Run an Erlang Check
              </AppButton>
            </div>

            <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-600" aria-label="Product assurances">
              <span class="landing-assurance">No account required</span>
              <span class="landing-assurance">Work stays in your browser</span>
              <span class="landing-assurance">CSV import and export</span>
            </div>
          </div>

          <div class="landing-product-window" role="img" aria-label="Annual staffing plan preview with monthly requirements, supply, and gaps">
            <div class="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p class="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Annual plan</p>
                <h2 class="mt-1 text-lg font-semibold tracking-[-0.025em] text-slate-950">Customer Care · 2026 Update</h2>
              </div>
              <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Current plan
              </span>
            </div>

            <div class="grid md:grid-cols-[8.8rem_minmax(0,1fr)]">
              <div class="hidden border-r border-slate-200 bg-slate-50/80 p-3 md:grid md:content-start md:gap-2">
                <div class="landing-plan-step landing-plan-step-ready">
                  <span>Forecast</span>
                  <strong>Applied</strong>
                </div>
                <div class="landing-plan-step landing-plan-step-ready">
                  <span>Availability</span>
                  <strong>12/12</strong>
                </div>
                <div class="landing-plan-step landing-plan-step-ready">
                  <span>Demand Model</span>
                  <strong>Calculated</strong>
                </div>
                <div class="landing-plan-step landing-plan-step-active">
                  <span>Staffing Plan</span>
                  <strong>Review</strong>
                </div>
                <div class="landing-plan-step">
                  <span>Actuals</span>
                  <strong>4 months</strong>
                </div>
              </div>

              <div class="min-w-0 p-4 sm:p-5">
                <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-950">Monthly staffing supply</p>
                    <p class="mt-1 text-xs text-slate-500">Actuals through April · forward forecast May–December</p>
                  </div>
                  <span class="rounded-lg bg-[#e8eff5] px-2.5 py-1 text-xs font-semibold text-[#15395f]">8/8 future months</span>
                </div>

                <div class="mb-4 grid grid-cols-3 gap-2">
                  <div class="landing-mini-stat">
                    <span>Peak required HC</span>
                    <strong>35.6</strong>
                  </div>
                  <div class="landing-mini-stat">
                    <span>Ending frontline</span>
                    <strong>36.0</strong>
                  </div>
                  <div class="landing-mini-stat">
                    <span>Planned classes</span>
                    <strong>3</strong>
                  </div>
                </div>

                <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th class="px-3 py-2.5">Month</th>
                        <th class="px-3 py-2.5 text-right">Req HC</th>
                        <th class="px-3 py-2.5 text-right">Supply</th>
                        <th class="px-3 py-2.5 text-right">Gap</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr v-for="row in heroMonths" :key="row.month">
                        <td class="px-3 py-3 font-semibold text-slate-800">{{ row.month }}</td>
                        <td class="px-3 py-3 text-right tabular-nums text-slate-600">{{ row.required }}</td>
                        <td class="px-3 py-3 text-right tabular-nums text-slate-600">{{ row.supply }}</td>
                        <td
                          class="px-3 py-3 text-right font-semibold tabular-nums"
                          :class="row.tone === 'positive' ? 'text-emerald-700' : 'text-rose-700'"
                        >
                          {{ row.gap }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" class="scroll-mt-24 border-y border-slate-200 bg-white">
        <div class="app-frame landing-frame py-14 lg:py-18">
          <div class="mb-9 grid gap-3 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:items-end">
            <div>
              <p class="landing-kicker">A connected operating workflow</p>
              <h2 class="mt-3 text-[clamp(2rem,3.5vw,3.15rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-slate-950">
                From demand signal to staffing decision.
              </h2>
            </div>
            <p class="max-w-2xl text-base leading-8 text-slate-600 lg:justify-self-end">
              Each workspace keeps its evidence attached, so a forecast can become a plan, a plan can become an update,
              and actuals can explain what changed.
            </p>
          </div>

          <ol class="grid border border-slate-200 bg-slate-50/60 md:grid-cols-2 xl:grid-cols-4">
            <li
              v-for="(step, index) in workflowSteps"
              :key="step.number"
              class="relative grid min-h-[13rem] content-start gap-4 border-slate-200 p-5 md:[&:nth-child(odd)]:border-r xl:border-r xl:last:border-r-0"
              :class="index >= 2 ? 'border-t xl:border-t-0' : ''"
            >
              <span class="text-xs font-semibold tracking-[0.15em] text-[#6f879d]">{{ step.number }}</span>
              <h3 class="text-xl font-semibold tracking-[-0.025em] text-slate-950">{{ step.title }}</h3>
              <p class="text-sm leading-7 text-slate-600">{{ step.description }}</p>
            </li>
          </ol>
        </div>
      </section>

      <section id="forecasting-workspace" class="scroll-mt-24 bg-[#f4f7fa]">
        <div class="app-frame landing-frame grid gap-12 py-16 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-center lg:gap-16 lg:py-20">
          <div class="landing-feature-window" role="img" aria-label="Demand forecast preview with accuracy metrics and a recorded manual adjustment">
            <div class="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Demand forecast</p>
                <p class="mt-1 font-semibold text-slate-950">Consumer Voice · 2026</p>
              </div>
              <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Planning ready</span>
            </div>

            <div class="grid gap-4 p-5">
              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="mb-3 flex items-center justify-between gap-4">
                  <p class="text-sm font-semibold text-slate-900">Forecasted demand vs historical volume</p>
                  <span class="text-xs text-slate-500">Jan–Dec 2026</span>
                </div>
                <svg viewBox="0 0 680 210" class="block h-auto w-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#8fb4ce" stop-opacity="0.42" />
                      <stop offset="100%" stop-color="#8fb4ce" stop-opacity="0.08" />
                    </linearGradient>
                  </defs>
                  <g stroke="#e2e8f0" stroke-width="1">
                    <line x1="35" y1="35" x2="660" y2="35" />
                    <line x1="35" y1="85" x2="660" y2="85" />
                    <line x1="35" y1="135" x2="660" y2="135" />
                    <line x1="35" y1="185" x2="660" y2="185" />
                  </g>
                  <path d="M35 156 C90 145 120 112 170 128 S260 94 315 111 S400 72 455 89 S540 58 660 54 L660 110 C555 114 515 122 455 132 S360 145 315 150 S220 158 170 166 S82 178 35 184 Z" fill="url(#forecastBand)" />
                  <path d="M35 165 C80 151 116 121 170 139 S255 107 315 123 S395 84 455 102 S540 73 660 69" fill="none" stroke="#0e7490" stroke-width="4" stroke-linecap="round" />
                  <path d="M35 171 C75 147 108 137 145 145 S215 106 250 126 S321 108 355 117" fill="none" stroke="#15395f" stroke-width="4" stroke-linecap="round" />
                  <line x1="355" y1="24" x2="355" y2="188" stroke="#d6a54a" stroke-width="2" stroke-dasharray="5 5" />
                  <text x="365" y="34" fill="#8a6118" font-size="12" font-family="sans-serif">Forecast begins</text>
                </svg>
              </div>

              <div class="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
                <div class="border border-[#c9d7e3] bg-[#eef4f8] p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[#516c85]">Recorded manual change</p>
                      <p class="mt-2 text-sm font-semibold text-slate-900">Summer campaign · +8% volume</p>
                      <p class="mt-1 text-xs leading-5 text-slate-600">Jun 1–Aug 31 · Approved by Commercial Planning</p>
                    </div>
                    <span class="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-[#15395f]">Applied</span>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="landing-accuracy-stat">
                    <span>WAPE</span>
                    <strong>7.8%</strong>
                  </div>
                  <div class="landing-accuracy-stat">
                    <span>Bias</span>
                    <strong>+1.2%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-6">
            <div>
              <p class="landing-kicker">Forecasting</p>
              <h2 class="mt-3 text-[clamp(2.25rem,4vw,3.6rem)] font-semibold leading-[1] tracking-[-0.05em] text-slate-950">
                A forecast you can inspect before you plan from it.
              </h2>
            </div>
            <p class="text-base leading-8 text-slate-700">
              Keep the demand curve, accuracy evidence, planning adjustments, and monthly handoff in the same staffing-group context.
            </p>
            <ul class="landing-feature-list">
              <li v-for="highlight in forecastingHighlights" :key="highlight">{{ highlight }}</li>
            </ul>
            <div>
              <AppButton href="#planning" variant="primary" size="lg" icon-position="right" :icon="mdiArrowRight">
                Open Forecasting
              </AppButton>
            </div>
          </div>
        </div>
      </section>

      <section id="planning-workspace" class="scroll-mt-24 bg-white">
        <div class="app-frame landing-frame grid gap-12 py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-16 lg:py-20">
          <div class="grid gap-6">
            <div>
              <p class="landing-kicker">Annual planning</p>
              <h2 class="mt-3 text-[clamp(2.25rem,4vw,3.6rem)] font-semibold leading-[1] tracking-[-0.05em] text-slate-950">
                Build a maintained plan, not a disposable calculation.
              </h2>
            </div>
            <p class="text-base leading-8 text-slate-700">
              Organize annual budgets and in-year updates around the call center and staffing group that own the work.
            </p>
            <ul class="landing-feature-list">
              <li v-for="highlight in planningHighlights" :key="highlight">{{ highlight }}</li>
            </ul>
            <div>
              <AppButton href="#planning" variant="primary" size="lg" icon-position="right" :icon="mdiArrowRight">
                Open Planning Workspace
              </AppButton>
            </div>
          </div>

          <figure class="landing-screenshot-frame">
            <img
              :src="planningToolImageUrl"
              alt="Planning Workspace showing staffing groups and annual plans."
              class="block aspect-[16/10] w-full object-cover object-top"
              loading="lazy"
            />
            <figcaption class="grid gap-1 border-t border-slate-200 bg-white px-5 py-4">
              <strong class="text-sm text-slate-800">Call center and staffing-group planning context</strong>
              <span class="text-sm leading-6 text-slate-500">Keep forecasts, plans, actuals, and settings attached to the operating team they describe.</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="actuals-workspace" class="scroll-mt-24 bg-[#f4f7fa]">
        <div class="app-frame landing-frame grid gap-12 py-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:gap-16 lg:py-20">
          <div class="landing-feature-window" role="img" aria-label="Actuals and variance preview comparing monthly planned and actual required headcount">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actuals &amp; variance</p>
                <p class="mt-1 font-semibold text-slate-950">Monthly requirement review</p>
              </div>
              <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">4 coverage-ready months</span>
            </div>
            <div class="p-5">
              <div class="mb-4 grid grid-cols-3 gap-2">
                <div class="landing-mini-stat">
                  <span>Actual contacts</span>
                  <strong>418k</strong>
                </div>
                <div class="landing-mini-stat">
                  <span>AHT variance</span>
                  <strong>+6 sec</strong>
                </div>
                <div class="landing-mini-stat">
                  <span>Peak actual HC</span>
                  <strong>31.3</strong>
                </div>
              </div>
              <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table class="w-full min-w-[34rem] text-left text-xs">
                  <thead class="bg-slate-50 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    <tr>
                      <th class="px-3 py-3">Month</th>
                      <th class="px-3 py-3">Open-date coverage</th>
                      <th class="px-3 py-3 text-right">Planned req HC</th>
                      <th class="px-3 py-3 text-right">Actual req HC</th>
                      <th class="px-3 py-3 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="row in actualsRows" :key="row.month">
                      <td class="px-3 py-3 font-semibold text-slate-800">{{ row.month }}</td>
                      <td class="px-3 py-3 text-emerald-700">{{ row.coverage }} complete</td>
                      <td class="px-3 py-3 text-right tabular-nums text-slate-600">{{ row.plan }}</td>
                      <td class="px-3 py-3 text-right tabular-nums text-slate-600">{{ row.actual }}</td>
                      <td
                        class="px-3 py-3 text-right font-semibold tabular-nums"
                        :class="row.variance.startsWith('+') ? 'text-rose-700' : 'text-emerald-700'"
                      >
                        {{ row.variance }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="grid gap-6">
            <div>
              <p class="landing-kicker">Actuals and variance</p>
              <h2 class="mt-3 text-[clamp(2.25rem,4vw,3.6rem)] font-semibold leading-[1] tracking-[-0.05em] text-slate-950">
                See what changed, then update the forward plan.
              </h2>
            </div>
            <p class="text-base leading-8 text-slate-700">
              Actual performance becomes operating evidence—not a separate spreadsheet that loses its connection to the plan.
            </p>
            <ul class="landing-feature-list">
              <li v-for="highlight in actualsHighlights" :key="highlight">{{ highlight }}</li>
            </ul>
            <div>
              <AppButton href="#planning" variant="secondary" size="lg" icon-position="right" :icon="mdiArrowRight">
                Review Planning Tools
              </AppButton>
            </div>
          </div>
        </div>
      </section>

      <section id="erlang-tools" class="scroll-mt-24 bg-white">
        <div class="app-frame landing-frame grid gap-12 py-16 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center lg:gap-16 lg:py-20">
          <div class="grid gap-6">
            <div>
              <p class="landing-kicker">Erlang calculators</p>
              <h2 class="mt-3 text-[clamp(2.25rem,4vw,3.6rem)] font-semibold leading-[1] tracking-[-0.05em] text-slate-950">
                Answer the immediate staffing question with visible assumptions.
              </h2>
            </div>
            <p class="text-base leading-8 text-slate-700">
              Use focused calculators for fast staffing analysis, then move into Planning Workspace when the decision needs a maintained operating record.
            </p>
            <ul class="landing-feature-list">
              <li v-for="highlight in erlangHighlights" :key="highlight">{{ highlight }}</li>
            </ul>
            <div>
              <AppButton href="#calculators/interval" variant="secondary" size="lg" icon-position="right" :icon="mdiArrowRight">
                Open Erlang Calculators
              </AppButton>
            </div>
          </div>

          <figure class="landing-screenshot-frame">
            <img
              :src="erlangToolImageUrl"
              alt="Erlang Calculators showing interval staffing inputs and recommendation results."
              class="block aspect-[16/10] w-full object-cover object-top"
              loading="lazy"
            />
            <figcaption class="grid gap-1 border-t border-slate-200 bg-white px-5 py-4">
              <strong class="text-sm text-slate-800">Recommendation curve with service outcomes</strong>
              <span class="text-sm leading-6 text-slate-500">Inspect required agents, headcount, service level, ASA, occupancy, and abandonment together.</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section class="border-y border-[#234867] bg-[#15395f] text-white">
        <div class="app-frame landing-frame grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Start with the question in front of you</p>
            <h2 class="mt-3 max-w-3xl text-[clamp(2rem,3.5vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.045em]">
              Build the forecast, staffing plan, or Erlang check you need—without an account.
            </h2>
          </div>
          <AppButton
            href="#planning"
            variant="secondary"
            size="lg"
            icon-position="right"
            :icon="mdiArrowRight"
            class="border-white bg-white text-[#15395f] hover:bg-slate-100"
          >
            Open WFM Toolkit
          </AppButton>
        </div>
      </section>

      <section class="bg-slate-50">
        <div class="app-frame landing-frame grid gap-3 py-10 text-sm italic leading-6 text-slate-600 lg:grid-cols-3 lg:gap-8">
          <p class="italic">
            WFMToolkit is provided for decision support and estimation only. Results are estimates and are not guaranteed.
            Review and validate outputs against your own requirements, obligations, and operating context.
            (<a href="/terms/index.html" class="underline decoration-slate-400 underline-offset-2 hover:text-slate-800">Terms</a>)
          </p>
          <p class="italic">WFMToolkit does not use accounts or store planning data on a server. Your work stays in your browser.</p>
          <p class="italic">WFMToolkit is a work in progress and changes frequently. Review key workflows and outputs after updates.</p>
        </div>
      </section>
    </main>

    <footer class="border-t border-slate-200 bg-white">
      <div class="app-frame landing-frame flex flex-col gap-4 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>Independent workforce planning and staffing tools built for practical analysis.</p>
        <div class="flex flex-wrap items-center gap-4">
          <a href="#planning" class="hover:text-[#173b5d]">Planning Workspace</a>
          <a href="#planning" class="hover:text-[#173b5d]">Forecasting</a>
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
  background: #ffffff;
  color: #0f172a;
}

.landing-frame {
  width: calc(100% - 2rem);
}

.landing-hero {
  background:
    linear-gradient(90deg, rgba(21, 57, 95, 0.045) 1px, transparent 1px),
    linear-gradient(rgba(21, 57, 95, 0.045) 1px, transparent 1px),
    linear-gradient(145deg, #f7fafc 0%, #ffffff 52%, #edf3f7 100%);
  background-size: 42px 42px, 42px 42px, auto;
}

.landing-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #526e88;
}

.landing-assurance {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.landing-assurance::before {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: #16805d;
  content: '';
}

.landing-product-window,
.landing-feature-window,
.landing-screenshot-frame {
  overflow: hidden;
  border: 1px solid #cbd7e2;
  background: #f8fafc;
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.12);
}

.landing-product-window {
  border-radius: 1.75rem;
}

.landing-feature-window,
.landing-screenshot-frame {
  border-radius: 1.5rem;
}

.landing-plan-step {
  display: grid;
  gap: 0.15rem;
  border: 1px solid transparent;
  border-radius: 0.7rem;
  padding: 0.62rem 0.7rem;
  color: #64748b;
}

.landing-plan-step span {
  font-size: 0.7rem;
  font-weight: 650;
}

.landing-plan-step strong {
  font-size: 0.65rem;
  font-weight: 650;
}

.landing-plan-step-ready {
  border-color: #bbebd8;
  background: #effbf6;
  color: #116b4e;
}

.landing-plan-step-active {
  border-color: #b7c9d9;
  background: #e8eff5;
  color: #15395f;
}

.landing-mini-stat {
  display: grid;
  min-width: 0;
  gap: 0.3rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.7rem;
  background: #f8fafc;
  padding: 0.7rem;
}

.landing-mini-stat span,
.landing-accuracy-stat span {
  overflow: hidden;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  color: #64748b;
}

.landing-mini-stat strong {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.landing-accuracy-stat {
  display: grid;
  align-content: center;
  gap: 0.25rem;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 0.75rem;
}

.landing-accuracy-stat strong {
  font-size: 1.05rem;
  color: #15395f;
}

.landing-feature-list {
  display: grid;
  border-top: 1px solid #dbe3ea;
}

.landing-feature-list li {
  position: relative;
  border-bottom: 1px solid #dbe3ea;
  padding: 0.9rem 0 0.9rem 2rem;
  font-size: 0.9rem;
  line-height: 1.75;
  color: #526174;
}

.landing-feature-list li::before {
  position: absolute;
  top: 1.45rem;
  left: 0;
  width: 1.15rem;
  height: 1px;
  background: #8198ac;
  content: '';
}

@media (min-width: 640px) {
  .landing-frame {
    width: calc(100% - 3rem);
  }
}

@media (min-width: 1280px) {
  .landing-frame {
    width: calc(100% - 5rem);
  }
}

@media (min-width: 1536px) {
  .landing-frame {
    width: calc(100% - 7rem);
  }
}
</style>
