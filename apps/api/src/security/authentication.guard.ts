import { randomUUID } from 'node:crypto';

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  SecurityError,
  securityErrorCodes,
  type SessionService,
} from '@saas/identity-access';

import type { SecurityRequest } from './security-request';
import { SESSION_SERVICE } from './security.tokens';

function firstHeader(
  headers: SecurityRequest['headers'],
  name: string,
): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function bearerToken(request: SecurityRequest): string {
  const authorization = firstHeader(request.headers, 'authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new SecurityError(
      securityErrorCodes.unauthenticated,
      'Authentication is required.',
      401,
    );
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new SecurityError(
      securityErrorCodes.unauthenticated,
      'Authentication is required.',
      401,
    );
  }
  return token;
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    @Inject(SESSION_SERVICE) private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SecurityRequest>();
    const requestId =
      firstHeader(request.headers, 'x-request-id') ?? randomUUID();
    request.requestId = requestId;
    const actor = await this.sessions.authenticate(bearerToken(request));
    const correlationId =
      firstHeader(request.headers, 'x-correlation-id') ?? requestId;
    request.security = {
      actor,
      requestContext: {
        actor,
        correlationId,
        requestId,
        tenant: null,
      },
      tenant: null,
    };
    return true;
  }
}
