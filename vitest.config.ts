import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    name: 'server',
    environment: 'node',
    setupFiles: ['./test/setup/server.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['admin/**', 'dist/**', 'node_modules/**', 'test/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
})
