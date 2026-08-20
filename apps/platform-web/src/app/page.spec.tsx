import { describe, expect, it } from 'vitest';

import PlatformHome from './page';

describe('PlatformHome', () => {
  it('provides the platform application shell', () => {
    expect(PlatformHome()).toBeTruthy();
  });
});
