import { defineConfig } from 'vitest/config';
import path from 'path';

// Integration tests run against a REAL Postgres (CI service container or a local DB),
// unlike the default suite which mocks Prisma. Run with: npm run test:integration
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.integration.test.ts'],
    fileParallelism: false, // serialize DB-touching tests
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
