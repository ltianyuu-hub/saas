import { describe, expect, it } from 'vitest';

import { securityErrorCodes } from '@saas/identity-access';

import { bearerToken } from './authentication.guard';

describe('AuthenticationGuard token boundary', () => {
  it('rejects a request without an opaque Bearer token', () => {
    expect(() => bearerToken({ headers: {} })).toThrowError(
      expect.objectContaining({ code: securityErrorCodes.unauthenticated }),
    );
  });

  it('extracts the opaque token without accepting actor or tenant headers', () => {
    expect(
      bearerToken({
        headers: {
          authorization: 'Bearer opaque-token',
          'x-actor-type': 'PLATFORM',
          'x-merchant-id': 'untrusted-merchant',
        },
      }),
    ).toBe('opaque-token');
  });
});
