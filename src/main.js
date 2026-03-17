import { createApp } from 'vue'
import App from './App.vue'
import './tailwind.css'
import { installPrimeVue } from './plugins/primevue'

const app = createApp(App)

installPrimeVue(app)
app.mount('#app')
