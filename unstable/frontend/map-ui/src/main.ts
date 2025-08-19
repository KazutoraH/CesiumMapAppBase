import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'


//import App from './components/CesiumMap.vue';
import App from './App.vue';
import 'cesium/Build/Cesium/Widgets/widgets.css'

//import App from './MapUi.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
