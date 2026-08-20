import type { ActorType } from './context';

export interface VerifiedIdentity {
  actorType: ActorType;
  provider: string;
  providerSubjectId: string;
  appId?: string;
}

export interface AuthenticationProvider<TCredential> {
  verify(credential: TCredential): Promise<VerifiedIdentity>;
}

export interface ResolvedIdentity {
  actorId: string;
  actorType: ActorType;
  permissionVersion: number;
}

export interface StoredSession {
  actorId: string;
  actorStatus: string;
  actorType: ActorType;
  expiresAt: Date;
  id: string;
  permissionVersion: number;
  permissionVersionSnapshot: number;
  roleCode: string | null;
  permissions: readonly string[];
  merchantId: string | null;
  primaryStoreId: string | null;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  storeIds: readonly string[];
}

export interface CreateSessionRecord {
  actorId: string;
  actorType: ActorType;
  expiresAt: Date;
  issuedAt: Date;
  permissionVersionSnapshot: number;
  tokenHash: string;
}

export interface SessionRepository {
  create(input: CreateSessionRecord): Promise<{ id: string }>;
  findByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<boolean>;
}

export interface IdentityResolver {
  resolve(identity: VerifiedIdentity): Promise<ResolvedIdentity | null>;
}

export interface TenantResourceRepository {
  merchantExists(merchantId: string): Promise<boolean>;
  staffExistsInTenant(staffId: string, merchantId: string): Promise<boolean>;
  assignmentExistsInTenant(
    assignmentId: string,
    merchantId: string,
  ): Promise<boolean>;
}
