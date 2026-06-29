import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Integration tests need a real DB; they run via vitest.integration.config.ts.
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      include: ['src/**/*.ts'],
      // Floor set just below current coverage to catch regressions; ratchet up over time.
      thresholds: { lines: 30, functions: 35, statements: 30, branches: 25 },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
