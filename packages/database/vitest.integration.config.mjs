import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/database/src/**/*.integration.spec.mjs',
      'packages/modules/identity-access/src/**/*.integration.spec.ts',
      'packages/modules/merchant/src/**/*.integration.spec.ts',
    ],
    fileParallelism: false,
    maxWorkers: 1,
  },
});
