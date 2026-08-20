import { describe, expect, it } from 'vitest';

import { createPrismaClient } from './index';

describe('createPrismaClient', () => {
  it('rejects an empty database URL without attempting a connection', () => {
    expect(() => createPrismaClient('   ')).toThrow(
      'DATABASE_URL must be provided to create PrismaClient.',
    );
  });
});
