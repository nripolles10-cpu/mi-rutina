import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { serviceWorker } from './scripts/vite-sw.mjs';

// base './' para que los archivos se carguen bien dentro de la app Android (Capacitor)
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
  build: { outDir: 'dist', sourcemap: false, target: 'es2020', chunkSizeWarningLimit: 2000 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
