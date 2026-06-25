import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    // Specs de E2E (Playwright) vivem em ./e2e e usam o runner do
    // @playwright/test, não o Vitest — precisam ficar fora da descoberta
    // de testes do Vitest para não colidir com `test.describe`/`test` do
    // Playwright.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
