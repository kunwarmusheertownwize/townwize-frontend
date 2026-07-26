// townwize-frontend\vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config.js (WEB)
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true, // expose on LAN so phone can connect via 192.168.100.45:5173
  },
  build: {
    rollupOptions: {
      // Native-only Capacitor plugins have no browser entry — exclude from bundle.
      // Capacitor's native layer provides them at runtime on device.
      external: ["@capacitor-community/background-geolocation"],
    },
  },
});

