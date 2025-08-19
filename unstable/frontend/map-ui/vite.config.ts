import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import cesium from 'vite-plugin-cesium'
import fs from 'node:fs'

// https://vite.dev/config/
export default defineConfig({
  base: './', // ← 追加
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    cesium(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      cesium: 'cesium' // 明示的にCesiumエイリアスを追加（念のため）
    },
  },
  define: {
    // 明示的にCESIUM_BASE_URLを指定（vite-plugin-cesiumが内部で使用）
    CESIUM_BASE_URL: JSON.stringify('/cesium')
  },
  server: {
    https: {
      key: fs.readFileSync('./localhost.key'),
      cert: fs.readFileSync('./localhost.crt'),
    },
    watch: {
      usePolling: true,
    },
    port: 5173,
    host: 'localhost',
    proxy: {
      // 国土地理院APIのプロキシ設定
      '/api/gsi': {
        target: 'https://mreversegeocoder.gsi.go.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gsi/, ''),
        secure: true,
      },
      // OpenStreetMap Nominatim APIのプロキシ設定
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
        secure: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
