import { createHash, randomBytes } from 'node:crypto';

import type { ActorContext } from './context';
import type {
  IdentityResolver,
  SessionRepository,
  VerifiedIdentity,
} from './ports';
import { SecurityError, securityErrorCodes } from './security-error';

export const defaultSessionTtlMs = 8 * 60 * 60 * 1000;

export interface IssuedSession {
  expiresAt: Date;
  rawToken: string;
  sessionId: string;
}

export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly identities: IdentityResolver,
    private readonly ttlMs = defaultSessionTtlMs,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
      throw new Error('Session TTL must be a positive safe integer.');
    }
  }

  static hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  async issue(identity: VerifiedIdentity): Promise<IssuedSession> {
    const resolved = await this.identities.resolve(identity);
    if (!resolved) {
      throw new SecurityError(
        securityErrorCodes.unauthenticated,
        'Verified identity is not linked to an actor.',
        401,
      );
    }

    const issuedAt = this.now();
    const expiresAt = new Date(issuedAt.getTime() + this.ttlMs);
    const rawToken = randomBytes(32).toString('base64url');
    const created = await this.sessions.create({
      actorId: resolved.actorId,
      actorType: resolved.actorType,
      expiresAt,
      issuedAt,
      permissionVersionSnapshot: resolved.permissionVersion,
      tokenHash: SessionService.hashToken(rawToken),
    });
    return { expiresAt, rawToken, sessionId: created.id };
  }

  async authenticate(rawToken: string): Promise<ActorContext> {
    if (rawToken.trim().length === 0) {
      throw new SecurityError(
        securityErrorCodes.unauthenticated,
        'Authentication is required.',
        401,
      );
    }
    const session = await this.sessions.findByTokenHash(
      SessionService.hashToken(rawToken),
    );
    if (!session) {
      throw new SecurityError(
        securityErrorCodes.invalidSession,
        'The session is invalid.',
        401,
      );
    }
    if (session.status === 'REVOKED') {
      throw new SecurityError(
        securityErrorCodes.sessionRevoked,
        'The session has been revoked.',
        401,
      );
    }
    if (session.status === 'EXPIRED' || session.expiresAt <= this.now()) {
      throw new SecurityError(
        securityErrorCodes.sessionExpired,
        'The session has expired.',
        401,
      );
    }
    if (session.actorStatus !== 'ACTIVE') {
      throw new SecurityError(
        securityErrorCodes.invalidSession,
        'The actor is not active.',
        401,
      );
    }
    if (
      session.actorType !== 'CONSUMER' &&
      session.permissionVersionSnapshot !== session.permissionVersion
    ) {
      throw new SecurityError(
        securityErrorCodes.permissionVersionMismatch,
        'The session permission version is stale.',
        401,
      );
    }

    if (session.actorType === 'CONSUMER') {
      return {
        actorId: session.actorId,
        actorType: 'CONSUMER',
        sessionId: session.id,
      };
    }
    if (!session.roleCode) {
      throw new SecurityError(
        securityErrorCodes.invalidSession,
        'The actor role is unavailable.',
        401,
      );
    }
    if (session.actorType === 'PLATFORM') {
      return {
        actorId: session.actorId,
        actorType: 'PLATFORM',
        permissions: new Set(session.permissions),
        roleCode: session.roleCode,
        sessionId: session.id,
      };
    }
    if (!session.merchantId) {
      throw new SecurityError(
        securityErrorCodes.invalidTenantContext,
        'The Staff tenant is unavailable.',
        403,
      );
    }
    return {
      actorId: session.actorId,
      actorType: 'STAFF',
      merchantId: session.merchantId,
      permissions: new Set(session.permissions),
      primaryStoreId: session.primaryStoreId,
      roleCode: session.roleCode,
      sessionId: session.id,
      storeIds: session.storeIds,
    };
  }

  async revoke(rawToken: string): Promise<void> {
    const revoked = await this.sessions.revokeByTokenHash(
      SessionService.hashToken(rawToken),
      this.now(),
    );
    if (!revoked) {
      throw new SecurityError(
        securityErrorCodes.invalidSession,
        'The session is invalid.',
        401,
      );
    }
  }
}
