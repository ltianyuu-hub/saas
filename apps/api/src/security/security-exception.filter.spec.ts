import { describe, expect, it, vi } from 'vitest';

import { SecurityError, securityErrorCodes } from '@saas/identity-access';

import { SecurityExceptionFilter } from './security-exception.filter';

describe('SecurityExceptionFilter', () => {
  it('uses the approved API error envelope and request id', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json, status }));
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          security: { requestContext: { requestId: 'request-123' } },
        }),
        getResponse: () => ({ json, status }),
      }),
    };
    new SecurityExceptionFilter().catch(
      new SecurityError(
        securityErrorCodes.forbidden,
        'Forbidden for test.',
        403,
      ),
      host as never,
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'FORBIDDEN', message: 'Forbidden for test.' },
      request_id: 'request-123',
    });
  });
});
