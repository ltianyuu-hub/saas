import { describe, expect, it } from 'vitest';

import MerchantHome from './page';

describe('MerchantHome', () => {
  it('provides the merchant application shell', () => {
    expect(MerchantHome()).toBeTruthy();
  });
});
