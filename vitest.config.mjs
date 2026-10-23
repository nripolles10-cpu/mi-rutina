import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'jsdom', globals: true, testTimeout: 30000, setupFiles: ['./tests/setup.js'] } });
