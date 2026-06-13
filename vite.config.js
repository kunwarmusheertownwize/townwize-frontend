// townwize-frontend\vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config.js (WEB)
export default defineConfig({
  plugins: [react()],
  base: '/', // ✅ REQUIRED for townwize.com
});

