import { randomUUID } from 'node:crypto';

import { createPrismaClient, type PrismaClient } from '@saas/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PermissionChecker,
  platformManagementPermissions,
} from './permissions';
import type { AuthenticationProvider, VerifiedIdentity } from './ports';
import {
  PrismaIdentityResolver,
  PrismaSessionRepository,
  PrismaTenantResourceRepository,
} from './prisma-adapters';
import { securityErrorCodes } from './security-error';
import { SessionService } from './session-service';
import { TenantContextService } from './tenant-service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required.');
const parsedUrl = new URL(testDatabaseUrl);
if (
  !new Set(['127.0.0.1', 'localhost', '::1', '[::1]']).has(
    parsedUrl.hostname,
  ) ||
  parsedUrl.pathname !== '/saas_test'
) {
  throw new Error('Identity integration tests require local saas_test.');
}

class TestAuthenticationAdapter implements AuthenticationProvider<string> {
  private readonly verified = new Map<string, VerifiedIdentity>();

  register(key: string, identity: VerifiedIdentity): void {
    this.verified.set(key, identity);
  }

  async verify(key: string): Promise<VerifiedIdentity> {
    const identity = this.verified.get(key);
    if (!identity) throw new Error('Test identity was not verified.');
    return identity;
  }
}

const prisma = createPrismaClient(testDatabaseUrl);
const ids = {
  assignmentA: randomUUID(),
  assignmentB: randomUUID(),
  assignmentMultiA: randomUUID(),
  assignmentMultiB: randomUUID(),
  assignmentTenantB: randomUUID(),
  brandA: randomUUID(),
  brandB: randomUUID(),
  consumer: randomUUID(),
  merchantA: randomUUID(),
  merchantB: randomUUID(),
  merchantAdminRole: randomUUID(),
  merchantStaffRoleA: randomUUID(),
  merchantStaffRoleB: randomUUID(),
  multiStaff: randomUUID(),
  platformReviewer: randomUUID(),
  platformReviewerRole: randomUUID(),
  platformSuperAdmin: randomUUID(),
  platformSuperRole: randomUUID(),
  staffA: randomUUID(),
  staffB: randomUUID(),
  storeA: randomUUID(),
  storeB: randomUUID(),
  storeTenantB: randomUUID(),
};

const permissionCodes = [
  'brand.manage',
  'brand.view',
  'merchant.view',
  'merchant.create',
  'merchant.lifecycle.manage',
  'merchant.review',
  'merchant_capability.manage',
  'merchant_capability.view',
  'platform_fee.manage',
  'staff.manage',
  'store.manage',
  'store.view',
  'voucher.redeem',
] as const;
const permissionIds = new Map(
  permissionCodes.map((code) => [code, randomUUID()]),
);

function identity(
  actorType: 'CONSUMER' | 'STAFF' | 'PLATFORM',
  subject: string,
): VerifiedIdentity {
  return actorType === 'PLATFORM'
    ? { actorType, provider: 'TEST', providerSubjectId: subject }
    : {
        actorType,
        appId: 'test-app',
        provider: 'TEST',
        providerSubjectId: subject,
      };
}

async function createMerchant(
  client: PrismaClient,
  merchantId: string,
  brandId: string,
  label: string,
): Promise<void> {
  await client.merchant.create({
    data: {
      contactName: 'Test Contact',
      contactPhone: '00000000000',
      displayName: `Test Merchant ${label}`,
      id: merchantId,
      legalEntityName: `Test Entity ${label}`,
      merchantCode: `MER-${merchantId}`,
      status: 'ACTIVE',
    },
  });
  await client.brand.create({
    data: {
      brandCode: `BR-${brandId}`,
      id: brandId,
      merchantId,
      name: `Brand ${label}`,
      status: 'ACTIVE',
    },
  });
}

async function createStaff(
  staffId: string,
  merchantId: string,
  roleId: string,
  primaryStoreId: string,
  label: string,
): Promise<void> {
  await prisma.staff.create({
    data: {
      displayName: `Staff ${label}`,
      id: staffId,
      merchantId,
      primaryStoreId,
      roleId,
      staffCode: `STAFF-${staffId}`,
      status: 'ACTIVE',
    },
  });
  await prisma.staffIdentity.create({
    data: {
      appId: 'test-app',
      provider: 'TEST',
      providerSubjectId: `staff-${label}`,
      staffId,
      status: 'ACTIVE',
    },
  });
}

async function seed(): Promise<void> {
  await createMerchant(prisma, ids.merchantA, ids.brandA, 'A');
  await createMerchant(prisma, ids.merchantB, ids.brandB, 'B');
  await prisma.store.createMany({
    data: [
      {
        address: 'Test Address A',
        brandId: ids.brandA,
        id: ids.storeA,
        merchantId: ids.merchantA,
        name: 'Store A',
        status: 'ACTIVE',
        storeCode: `ST-${ids.storeA}`,
      },
      {
        address: 'Test Address B',
        brandId: ids.brandA,
        id: ids.storeB,
        merchantId: ids.merchantA,
        name: 'Store B',
        status: 'ACTIVE',
        storeCode: `ST-${ids.storeB}`,
      },
      {
        address: 'Test Address Tenant B',
        brandId: ids.brandB,
        id: ids.storeTenantB,
        merchantId: ids.merchantB,
        name: 'Store Tenant B',
        status: 'ACTIVE',
        storeCode: `ST-${ids.storeTenantB}`,
      },
    ],
  });
  await prisma.permission.createMany({
    data: permissionCodes.map((code) => ({
      id: permissionIds.get(code)!,
      name: `Test ${code}`,
      permissionCode: code,
    })),
  });
  await prisma.role.createMany({
    data: [
      {
        id: ids.platformSuperRole,
        name: 'Platform Super Admin',
        roleCode: 'PLATFORM_SUPER_ADMIN',
      },
      {
        id: ids.platformReviewerRole,
        name: 'Platform Reviewer',
        roleCode: 'PLATFORM_REVIEWER',
      },
      {
        id: ids.merchantAdminRole,
        merchantId: ids.merchantA,
        name: 'Merchant Admin',
        roleCode: 'MERCHANT_ADMIN',
      },
      {
        id: ids.merchantStaffRoleA,
        merchantId: ids.merchantA,
        name: 'Merchant Staff',
        roleCode: 'MERCHANT_STAFF',
      },
      {
        id: ids.merchantStaffRoleB,
        merchantId: ids.merchantB,
        name: 'Merchant Staff',
        roleCode: 'MERCHANT_STAFF',
      },
    ],
  });
  await prisma.rolePermission.createMany({
    data: [
      {
        permissionId: permissionIds.get('merchant.view')!,
        roleId: ids.platformReviewerRole,
      },
      {
        permissionId: permissionIds.get('merchant.review')!,
        roleId: ids.platformReviewerRole,
      },
      {
        permissionId: permissionIds.get('brand.view')!,
        roleId: ids.platformReviewerRole,
      },
      {
        permissionId: permissionIds.get('store.view')!,
        roleId: ids.platformReviewerRole,
      },
      {
        permissionId: permissionIds.get('staff.manage')!,
        roleId: ids.merchantAdminRole,
      },
      {
        permissionId: permissionIds.get('voucher.redeem')!,
        roleId: ids.merchantStaffRoleA,
      },
    ],
  });
  await createStaff(
    ids.staffA,
    ids.merchantA,
    ids.merchantStaffRoleA,
    ids.storeA,
    'A',
  );
  await createStaff(
    ids.multiStaff,
    ids.merchantA,
    ids.merchantAdminRole,
    ids.storeA,
    'MULTI',
  );
  await createStaff(
    ids.staffB,
    ids.merchantB,
    ids.merchantStaffRoleB,
    ids.storeTenantB,
    'B',
  );
  await prisma.staffStoreAssignment.createMany({
    data: [
      {
        id: ids.assignmentA,
        merchantId: ids.merchantA,
        staffId: ids.staffA,
        status: 'ACTIVE',
        storeId: ids.storeA,
      },
      {
        id: ids.assignmentMultiA,
        merchantId: ids.merchantA,
        staffId: ids.multiStaff,
        status: 'ACTIVE',
        storeId: ids.storeA,
      },
      {
        id: ids.assignmentMultiB,
        merchantId: ids.merchantA,
        staffId: ids.multiStaff,
        status: 'ACTIVE',
        storeId: ids.storeB,
      },
      {
        id: ids.assignmentTenantB,
        merchantId: ids.merchantB,
        staffId: ids.staffB,
        status: 'ACTIVE',
        storeId: ids.storeTenantB,
      },
    ],
  });
  await prisma.platformAdmin.createMany({
    data: [
      {
        adminCode: `ADMIN-${ids.platformReviewer}`,
        displayName: 'Test Reviewer',
        id: ids.platformReviewer,
        roleId: ids.platformReviewerRole,
        status: 'ACTIVE',
      },
      {
        adminCode: `ADMIN-${ids.platformSuperAdmin}`,
        displayName: 'Test Super Admin',
        id: ids.platformSuperAdmin,
        roleId: ids.platformSuperRole,
        status: 'ACTIVE',
      },
    ],
  });
  await prisma.platformAdminIdentity.createMany({
    data: [
      {
        platformAdminId: ids.platformReviewer,
        provider: 'TEST',
        providerSubjectId: 'platform-reviewer',
        status: 'ACTIVE',
      },
      {
        platformAdminId: ids.platformSuperAdmin,
        provider: 'TEST',
        providerSubjectId: 'platform-super',
        status: 'ACTIVE',
      },
    ],
  });
  await prisma.consumer.create({
    data: { id: ids.consumer, status: 'ACTIVE' },
  });
  await prisma.externalIdentity.create({
    data: {
      appId: 'test-app',
      consumerId: ids.consumer,
      provider: 'TEST',
      providerSubjectId: 'consumer',
    },
  });
}

async function cleanup(): Promise<void> {
  await prisma.authSession.deleteMany({
    where: {
      OR: [
        { staffId: { in: [ids.staffA, ids.multiStaff, ids.staffB] } },
        {
          platformAdminId: {
            in: [ids.platformReviewer, ids.platformSuperAdmin],
          },
        },
        { consumerId: ids.consumer },
      ],
    },
  });
  await prisma.platformAdminIdentity.deleteMany({
    where: {
      platformAdminId: { in: [ids.platformReviewer, ids.platformSuperAdmin] },
    },
  });
  await prisma.platformAdmin.deleteMany({
    where: { id: { in: [ids.platformReviewer, ids.platformSuperAdmin] } },
  });
  await prisma.externalIdentity.deleteMany({
    where: { consumerId: ids.consumer },
  });
  await prisma.consumer.deleteMany({ where: { id: ids.consumer } });
  await prisma.staffIdentity.deleteMany({
    where: { staffId: { in: [ids.staffA, ids.multiStaff, ids.staffB] } },
  });
  await prisma.staffStoreAssignment.deleteMany({
    where: { staffId: { in: [ids.staffA, ids.multiStaff, ids.staffB] } },
  });
  await prisma.staff.deleteMany({
    where: { id: { in: [ids.staffA, ids.multiStaff, ids.staffB] } },
  });
  await prisma.rolePermission.deleteMany({
    where: {
      roleId: {
        in: [
          ids.platformReviewerRole,
          ids.platformSuperRole,
          ids.merchantAdminRole,
          ids.merchantStaffRoleA,
          ids.merchantStaffRoleB,
        ],
      },
    },
  });
  await prisma.role.deleteMany({
    where: {
      id: {
        in: [
          ids.platformReviewerRole,
          ids.platformSuperRole,
          ids.merchantAdminRole,
          ids.merchantStaffRoleA,
          ids.merchantStaffRoleB,
        ],
      },
    },
  });
  await prisma.permission.deleteMany({
    where: { id: { in: [...permissionIds.values()] } },
  });
  await prisma.store.deleteMany({
    where: { id: { in: [ids.storeA, ids.storeB, ids.storeTenantB] } },
  });
  await prisma.brand.deleteMany({
    where: { id: { in: [ids.brandA, ids.brandB] } },
  });
  await prisma.merchant.deleteMany({
    where: { id: { in: [ids.merchantA, ids.merchantB] } },
  });
}

describe('Identity/Tenant/RBAC application integration', () => {
  const adapter = new TestAuthenticationAdapter();
  const permissions = new PermissionChecker();
  const sessions = new PrismaSessionRepository(prisma);
  const resolver = new PrismaIdentityResolver(prisma);
  const service = new SessionService(sessions, resolver, 60 * 60 * 1000);
  const tenants = new TenantContextService(
    new PrismaTenantResourceRepository(prisma),
    permissions,
  );

  beforeAll(async () => {
    await seed();
    adapter.register('staff-a', identity('STAFF', 'staff-A'));
    adapter.register('staff-multi', identity('STAFF', 'staff-MULTI'));
    adapter.register('reviewer', identity('PLATFORM', 'platform-reviewer'));
    adapter.register('super', identity('PLATFORM', 'platform-super'));
    adapter.register('consumer', identity('CONSUMER', 'consumer'));
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('issues and authenticates a Staff opaque Session without storing raw token', async () => {
    const issued = await service.issue(await adapter.verify('staff-a'));
    const stored = await prisma.authSession.findUniqueOrThrow({
      where: { id: issued.sessionId },
    });
    expect(stored.tokenHash).toBe(SessionService.hashToken(issued.rawToken));
    expect(stored.tokenHash).not.toBe(issued.rawToken);
    await expect(service.authenticate(issued.rawToken)).resolves.toMatchObject({
      actorId: ids.staffA,
      actorType: 'STAFF',
      merchantId: ids.merchantA,
      primaryStoreId: ids.storeA,
      storeIds: [ids.storeA],
    });
  });

  it('revokes a Session without deleting its history', async () => {
    const issued = await service.issue(await adapter.verify('staff-a'));
    await service.revoke(issued.rawToken);
    await expect(service.authenticate(issued.rawToken)).rejects.toMatchObject({
      code: securityErrorCodes.sessionRevoked,
    });
    await expect(
      prisma.authSession.findUnique({ where: { id: issued.sessionId } }),
    ).resolves.toMatchObject({ status: 'REVOKED' });
  });

  it('rejects an expired Session', async () => {
    const issuedAt = new Date('2030-01-01T00:00:00.000Z');
    const issuing = new SessionService(
      sessions,
      resolver,
      1_000,
      () => issuedAt,
    );
    const issued = await issuing.issue(await adapter.verify('staff-a'));
    const expired = new SessionService(
      sessions,
      resolver,
      1_000,
      () => new Date('2030-01-01T00:00:02.000Z'),
    );
    await expect(expired.authenticate(issued.rawToken)).rejects.toMatchObject({
      code: securityErrorCodes.sessionExpired,
    });
  });

  it('invalidates old Staff Sessions after permission version changes', async () => {
    const oldSession = await service.issue(await adapter.verify('staff-a'));
    await prisma.staff.update({
      where: { id: ids.staffA },
      data: { permissionVersion: { increment: 1 } },
    });
    await expect(
      service.authenticate(oldSession.rawToken),
    ).rejects.toMatchObject({
      code: securityErrorCodes.permissionVersionMismatch,
    });
    const replacement = await service.issue(await adapter.verify('staff-a'));
    await expect(
      service.authenticate(replacement.rawToken),
    ).resolves.toMatchObject({
      actorId: ids.staffA,
    });
  });

  it('invalidates a Staff Session immediately after suspension', async () => {
    const issued = await service.issue(await adapter.verify('staff-a'));
    await prisma.staff.update({
      where: { id: ids.staffA },
      data: { status: 'SUSPENDED' },
    });
    await expect(service.authenticate(issued.rawToken)).rejects.toMatchObject({
      code: securityErrorCodes.invalidSession,
    });
    await prisma.staff.update({
      where: { id: ids.staffA },
      data: { status: 'ACTIVE' },
    });
  });

  it('builds Staff Tenant Context only from authenticated Staff', async () => {
    const issued = await service.issue(await adapter.verify('staff-a'));
    const actor = await service.authenticate(issued.rawToken);
    expect(tenants.fromStaff(actor)).toEqual({
      merchantId: ids.merchantA,
      source: 'STAFF_SESSION',
    });
  });

  it('allows assigned Store, denies unassigned Store, and supports multi-store', async () => {
    const staffSession = await service.issue(await adapter.verify('staff-a'));
    const staff = await service.authenticate(staffSession.rawToken);
    if (staff.actorType !== 'STAFF') throw new Error('Expected Staff actor.');
    expect(permissions.has(staff, 'voucher.redeem')).toBe(true);
    expect(() => tenants.requireStore(staff, ids.storeA)).not.toThrow();
    expect(() => tenants.requireStore(staff, ids.storeB)).toThrowError(
      expect.objectContaining({ code: securityErrorCodes.forbidden }),
    );

    const multiSession = await service.issue(
      await adapter.verify('staff-multi'),
    );
    const multi = await service.authenticate(multiSession.rawToken);
    if (multi.actorType !== 'STAFF') throw new Error('Expected Staff actor.');
    expect(permissions.has(multi, 'staff.manage')).toBe(true);
    expect(() => tenants.requireStore(multi, ids.storeA)).not.toThrow();
    expect(() => tenants.requireStore(multi, ids.storeB)).not.toThrow();
  });

  it('returns NOT_FOUND for known cross-tenant Staff and Assignment IDs', async () => {
    const issued = await service.issue(await adapter.verify('staff-a'));
    const actor = await service.authenticate(issued.rawToken);
    const tenant = tenants.fromStaff(actor);
    await expect(
      tenants.requireStaffResource(tenant, ids.staffB),
    ).rejects.toMatchObject({ code: securityErrorCodes.resourceNotFound });
    await expect(
      tenants.requireAssignmentResource(tenant, ids.assignmentTenantB),
    ).rejects.toMatchObject({ code: securityErrorCodes.resourceNotFound });
  });

  it('enforces Platform Reviewer boundaries and TargetTenantContext', async () => {
    const issued = await service.issue(await adapter.verify('reviewer'));
    const reviewer = await service.authenticate(issued.rawToken);
    expect(permissions.has(reviewer, 'merchant.view')).toBe(true);
    expect(permissions.has(reviewer, 'brand.view')).toBe(true);
    expect(permissions.has(reviewer, 'store.view')).toBe(true);
    expect(permissions.has(reviewer, 'merchant.lifecycle.manage')).toBe(false);
    expect(permissions.has(reviewer, 'merchant_capability.manage')).toBe(false);
    expect(permissions.has(reviewer, 'platform_fee.manage')).toBe(false);
    await expect(
      tenants.fromPlatformTarget(reviewer, ids.merchantA, 'merchant.view'),
    ).resolves.toEqual({
      merchantId: ids.merchantA,
      source: 'PLATFORM_TARGET',
    });
  });

  it.each(['staff-a', 'staff-multi'])(
    'denies Merchant role %s access to Platform TargetTenantContext',
    async (identityKey) => {
      const issued = await service.issue(await adapter.verify(identityKey));
      const staff = await service.authenticate(issued.rawToken);
      await expect(
        tenants.fromPlatformTarget(staff, ids.merchantA, 'merchant.view'),
      ).rejects.toMatchObject({ code: securityErrorCodes.forbidden });
    },
  );

  it('expands all registered Platform permissions for Super Admin centrally', async () => {
    const issued = await service.issue(await adapter.verify('super'));
    const superAdmin = await service.authenticate(issued.rawToken);
    expect(permissions.has(superAdmin, 'merchant.view')).toBe(true);
    for (const permission of platformManagementPermissions) {
      expect(permissions.has(superAdmin, permission)).toBe(true);
    }
  });

  it.each(['staff-a', 'staff-multi'])(
    'prevents Merchant actor %s from self-elevating into Platform management',
    async (identityKey) => {
      const issued = await service.issue(await adapter.verify(identityKey));
      const merchantActor = await service.authenticate(issued.rawToken);
      for (const permission of [
        'merchant.create',
        'merchant.lifecycle.manage',
        'brand.manage',
        'store.manage',
        'merchant_capability.manage',
      ]) {
        expect(permissions.has(merchantActor, permission)).toBe(false);
      }
    },
  );

  it('invalidates Platform Sessions on version change and suspension', async () => {
    const stale = await service.issue(await adapter.verify('reviewer'));
    await prisma.platformAdmin.update({
      where: { id: ids.platformReviewer },
      data: { permissionVersion: { increment: 1 } },
    });
    await expect(service.authenticate(stale.rawToken)).rejects.toMatchObject({
      code: securityErrorCodes.permissionVersionMismatch,
    });
    const current = await service.issue(await adapter.verify('reviewer'));
    await prisma.platformAdmin.update({
      where: { id: ids.platformReviewer },
      data: { status: 'SUSPENDED' },
    });
    await expect(service.authenticate(current.rawToken)).rejects.toMatchObject({
      code: securityErrorCodes.invalidSession,
    });
    await prisma.platformAdmin.update({
      where: { id: ids.platformReviewer },
      data: { status: 'ACTIVE' },
    });
  });

  it('resolves the minimum Consumer Session foundation', async () => {
    const issued = await service.issue(await adapter.verify('consumer'));
    await expect(service.authenticate(issued.rawToken)).resolves.toMatchObject({
      actorId: ids.consumer,
      actorType: 'CONSUMER',
    });
  });
});
