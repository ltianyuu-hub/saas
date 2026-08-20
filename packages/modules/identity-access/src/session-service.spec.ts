import { describe, expect, it } from 'vitest';

import type {
  CreateSessionRecord,
  IdentityResolver,
  SessionRepository,
  StoredSession,
} from './ports';
import { securityErrorCodes } from './security-error';
import { SessionService } from './session-service';

class MemorySessions implements SessionRepository {
  stored: StoredSession | null = null;
  created: CreateSessionRecord | null = null;

  async create(input: CreateSessionRecord): Promise<{ id: string }> {
    this.created = input;
    return { id: 'session-id' };
  }

  async findByTokenHash(): Promise<StoredSession | null> {
    return this.stored;
  }

  async revokeByTokenHash(): Promise<boolean> {
    return this.stored !== null;
  }
}

const identities: IdentityResolver = {
  resolve: async () => ({
    actorId: 'staff-id',
    actorType: 'STAFF',
    permissionVersion: 3,
  }),
};

function validStaffSession(): StoredSession {
  return {
    actorId: 'staff-id',
    actorStatus: 'ACTIVE',
    actorType: 'STAFF',
    expiresAt: new Date('2030-01-02T00:00:00.000Z'),
    id: 'session-id',
    merchantId: 'merchant-id',
    permissionVersion: 3,
    permissionVersionSnapshot: 3,
    permissions: ['voucher.redeem'],
    primaryStoreId: 'store-a',
    roleCode: 'MERCHANT_STAFF',
    status: 'ACTIVE',
    storeIds: ['store-a', 'store-b'],
  };
}

describe('SessionService', () => {
  it('issues a 256-bit opaque token and persists only its hash', async () => {
    const sessions = new MemorySessions();
    const service = new SessionService(
      sessions,
      identities,
      60_000,
      () => new Date('2030-01-01T00:00:00.000Z'),
    );
    const issued = await service.issue({
      actorType: 'STAFF',
      appId: 'test-app',
      provider: 'TEST',
      providerSubjectId: 'subject',
    });

    expect(Buffer.from(issued.rawToken, 'base64url')).toHaveLength(32);
    expect(sessions.created?.tokenHash).toBe(
      SessionService.hashToken(issued.rawToken),
    );
    expect(JSON.stringify(sessions.created)).not.toContain(issued.rawToken);
  });

  it.each([
    ['REVOKED', securityErrorCodes.sessionRevoked],
    ['EXPIRED', securityErrorCodes.sessionExpired],
  ] as const)('rejects a %s session', async (status, code) => {
    const sessions = new MemorySessions();
    sessions.stored = { ...validStaffSession(), status };
    const service = new SessionService(
      sessions,
      identities,
      60_000,
      () => new Date('2030-01-01T00:00:00.000Z'),
    );
    await expect(service.authenticate('raw-token')).rejects.toMatchObject({
      code,
    });
  });

  it('rejects a stale permission version', async () => {
    const sessions = new MemorySessions();
    sessions.stored = {
      ...validStaffSession(),
      permissionVersion: 4,
      permissionVersionSnapshot: 3,
    };
    const service = new SessionService(sessions, identities);
    await expect(service.authenticate('raw-token')).rejects.toMatchObject({
      code: securityErrorCodes.permissionVersionMismatch,
    });
  });
});
