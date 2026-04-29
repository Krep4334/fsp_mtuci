import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Чтобы Vitest не пытался запускать Playwright e2e тесты (`*.spec.ts`)
    // и чтобы unit-тесты оставались только в `src/`.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/test/**', 'e2e/**'],
  },
})
