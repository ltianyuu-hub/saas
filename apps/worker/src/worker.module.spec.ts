import { describe, expect, it } from 'vitest';

import { WorkerModule } from './worker.module';

describe('WorkerModule', () => {
  it('exposes the worker process root module', () => {
    expect(WorkerModule).toBeDefined();
  });
});
