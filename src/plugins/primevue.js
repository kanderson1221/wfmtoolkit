import PrimeVue from 'primevue/config'

export const installPrimeVue = (app) => {
  app.use(PrimeVue, {
    unstyled: true
  })
}
