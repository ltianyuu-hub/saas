import type { PrismaClient } from '@saas/database';

import type {
  CreateSessionRecord,
  IdentityResolver,
  ResolvedIdentity,
  SessionRepository,
  StoredSession,
  TenantResourceRepository,
  VerifiedIdentity,
} from './ports';

export class PrismaIdentityResolver implements IdentityResolver {
  constructor(private readonly prisma: PrismaClient) {}

  async resolve(identity: VerifiedIdentity): Promise<ResolvedIdentity | null> {
    if (identity.actorType === 'PLATFORM') {
      const record = await this.prisma.platformAdminIdentity.findUnique({
        where: {
          provider_providerSubjectId: {
            provider: identity.provider,
            providerSubjectId: identity.providerSubjectId,
          },
        },
        include: { platformAdmin: true },
      });
      return record?.status === 'ACTIVE' &&
        record.platformAdmin.status === 'ACTIVE'
        ? {
            actorId: record.platformAdminId,
            actorType: 'PLATFORM',
            permissionVersion: record.platformAdmin.permissionVersion,
          }
        : null;
    }

    if (!identity.appId) return null;
    if (identity.actorType === 'STAFF') {
      const record = await this.prisma.staffIdentity.findUnique({
        where: {
          provider_appId_providerSubjectId: {
            appId: identity.appId,
            provider: identity.provider,
            providerSubjectId: identity.providerSubjectId,
          },
        },
        include: { staff: true },
      });
      return record?.status === 'ACTIVE' && record.staff.status === 'ACTIVE'
        ? {
            actorId: record.staffId,
            actorType: 'STAFF',
            permissionVersion: record.staff.permissionVersion,
          }
        : null;
    }

    const record = await this.prisma.externalIdentity.findUnique({
      where: {
        provider_appId_providerSubjectId: {
          appId: identity.appId,
          provider: identity.provider,
          providerSubjectId: identity.providerSubjectId,
        },
      },
    });
    if (!record) return null;
    const consumer = await this.prisma.consumer.findUnique({
      where: { id: record.consumerId },
      select: { status: true },
    });
    return consumer?.status === 'ACTIVE'
      ? {
          actorId: record.consumerId,
          actorType: 'CONSUMER',
          permissionVersion: 1,
        }
      : null;
  }
}

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateSessionRecord): Promise<{ id: string }> {
    const actorReference =
      input.actorType === 'STAFF'
        ? { staffId: input.actorId }
        : input.actorType === 'PLATFORM'
          ? { platformAdminId: input.actorId }
          : { consumerId: input.actorId };
    return this.prisma.authSession.create({
      data: {
        actorType: input.actorType,
        expiresAt: input.expiresAt,
        issuedAt: input.issuedAt,
        permissionVersionSnapshot: input.permissionVersionSnapshot,
        status: 'ACTIVE',
        tokenHash: input.tokenHash,
        ...actorReference,
      },
      select: { id: true },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash },
      include: {
        consumer: true,
        platformAdmin: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        staff: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
            storeAssignments: {
              where: { status: 'ACTIVE' },
              select: { storeId: true },
            },
          },
        },
      },
    });
    if (!session) return null;

    if (session.actorType === 'STAFF' && session.staff) {
      return {
        actorId: session.staff.id,
        actorStatus: session.staff.status,
        actorType: 'STAFF',
        expiresAt: session.expiresAt,
        id: session.id,
        merchantId: session.staff.merchantId,
        permissionVersion: session.staff.permissionVersion,
        permissionVersionSnapshot: session.permissionVersionSnapshot,
        permissions: session.staff.role.rolePermissions.map(
          ({ permission }) => permission.permissionCode,
        ),
        primaryStoreId: session.staff.primaryStoreId,
        roleCode: session.staff.role.roleCode,
        status: session.status,
        storeIds: session.staff.storeAssignments.map(({ storeId }) => storeId),
      };
    }
    if (session.actorType === 'PLATFORM' && session.platformAdmin) {
      return {
        actorId: session.platformAdmin.id,
        actorStatus: session.platformAdmin.status,
        actorType: 'PLATFORM',
        expiresAt: session.expiresAt,
        id: session.id,
        merchantId: null,
        permissionVersion: session.platformAdmin.permissionVersion,
        permissionVersionSnapshot: session.permissionVersionSnapshot,
        permissions: session.platformAdmin.role.rolePermissions.map(
          ({ permission }) => permission.permissionCode,
        ),
        primaryStoreId: null,
        roleCode: session.platformAdmin.role.roleCode,
        status: session.status,
        storeIds: [],
      };
    }
    if (session.actorType === 'CONSUMER' && session.consumer) {
      return {
        actorId: session.consumer.id,
        actorStatus: session.consumer.status,
        actorType: 'CONSUMER',
        expiresAt: session.expiresAt,
        id: session.id,
        merchantId: null,
        permissionVersion: 1,
        permissionVersionSnapshot: session.permissionVersionSnapshot,
        permissions: [],
        primaryStoreId: null,
        roleCode: null,
        status: session.status,
        storeIds: [],
      };
    }
    return null;
  }

  async revokeByTokenHash(
    tokenHash: string,
    revokedAt: Date,
  ): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      where: { status: 'ACTIVE', tokenHash },
      data: { revokedAt, status: 'REVOKED' },
    });
    return result.count === 1;
  }
}

export class PrismaTenantResourceRepository implements TenantResourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async merchantExists(merchantId: string): Promise<boolean> {
    return (
      (await this.prisma.merchant.count({ where: { id: merchantId } })) === 1
    );
  }

  async staffExistsInTenant(
    staffId: string,
    merchantId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.staff.count({
        where: { id: staffId, merchantId },
      })) === 1
    );
  }

  async assignmentExistsInTenant(
    assignmentId: string,
    merchantId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.staffStoreAssignment.count({
        where: { id: assignmentId, merchantId },
      })) === 1
    );
  }
}
