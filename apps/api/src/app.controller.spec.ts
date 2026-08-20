import { describe, expect, it } from 'vitest';

import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns the API health placeholder', () => {
    expect(new AppController().health()).toEqual({ status: 'ok' });
  });
});
