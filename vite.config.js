// townwize-frontend\vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'node:os'

/**
 * The machine's LAN address, so the QR code can point a phone at this dev
 * server. The browser has no way to discover this itself — `window.location`
 * only ever reports `localhost` when that is what you typed — so it is baked in
 * at dev-server start and left undefined in production builds.
 */
const lanOrigin = (port) => {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      const family = typeof a.family === 'string' ? a.family : `IPv${a.family}`;
      if (family === 'IPv4' && !a.internal) return `http://${a.address}:${port}`;
    }
  }
  return null;
};

const PORT = 5173;

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/',
  server: {
    host: true, // expose on LAN so phone can connect via 192.168.x.x:5173
    port: PORT,
  },
  define: {
    __DEV_LAN_ORIGIN__: JSON.stringify(command === 'serve' ? lanOrigin(PORT) : null),
  },
}));
