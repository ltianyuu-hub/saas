import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@saas/database';
import type {
  PlatformActorContext,
  RequestContext,
  StaffActorContext,
} from '@saas/identity-access';
import { afterAll, describe, expect, it } from 'vitest';

import {
  MerchantApplicationService,
  MerchantBootstrapService,
} from './merchant-application';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required.');
const parsed = new URL(databaseUrl);
if (
  !new Set(['127.0.0.1', 'localhost', '::1', '[::1]']).has(parsed.hostname) ||
  parsed.pathname !== '/saas_test'
) {
  throw new Error('Merchant integration tests require local saas_test.');
}

const prisma = createPrismaClient(databaseUrl);
const service = new MerchantApplicationService(prisma);
const bootstrapService = new MerchantBootstrapService(prisma);
const testRun = randomUUID();

const superActor: PlatformActorContext = {
  actorId: randomUUID(),
  actorType: 'PLATFORM',
  sessionId: randomUUID(),
  roleCode: 'PLATFORM_SUPER_ADMIN',
  permissions: new Set(),
};
const reviewerActor: PlatformActorContext = {
  actorId: randomUUID(),
  actorType: 'PLATFORM',
  sessionId: randomUUID(),
  roleCode: 'PLATFORM_REVIEWER',
  permissions: new Set(['merchant.view', 'brand.view', 'store.view']),
};
const context = (
  actor: PlatformActorContext | StaffActorContext,
): RequestContext => ({
  actor,
  tenant:
    actor.actorType === 'STAFF'
      ? { merchantId: actor.merchantId, source: 'STAFF_SESSION' }
      : null,
  requestId: randomUUID(),
  correlationId: randomUUID(),
});

async function createMerchant(label: string) {
  const merchant = await service.createMerchant(context(superActor), {
    merchantCode: `IT-${testRun}-${label}`,
    displayName: `Integration Merchant ${label}`,
    legalEntityName: `Integration Entity ${label}`,
    contactName: 'Integration Contact',
    contactPhone: '00000000000',
  });
  return merchant;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Merchant/Brand/Store/Capability PostgreSQL integration', () => {
  it('allows Super Admin creation, initializes PENDING_SETUP and denies Reviewer/Merchant actors', async () => {
    const merchant = await createMerchant('AUTH');
    expect(merchant.status).toBe('PENDING_SETUP');
    await expect(
      service.createMerchant(context(reviewerActor), {
        merchantCode: `DENIED-${testRun}`,
        displayName: 'Denied',
        legalEntityName: 'Denied',
        contactName: 'Denied',
        contactPhone: '0',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const staffActor: StaffActorContext = {
      actorId: randomUUID(),
      actorType: 'STAFF',
      sessionId: randomUUID(),
      merchantId: merchant.id,
      roleCode: 'MERCHANT_ADMIN',
      permissions: new Set(),
      primaryStoreId: null,
      storeIds: [],
    };
    await expect(
      service.createMerchant(context(staffActor), {
        merchantCode: `SELF-${testRun}`,
        displayName: 'Self',
        legalEntityName: 'Self',
        contactName: 'Self',
        contactPhone: '0',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('executes only approved lifecycle transitions and audits every action', async () => {
    const merchant = await createMerchant('LIFECYCLE');
    await service.transitionMerchant(
      context(superActor),
      merchant.id,
      'ACTIVATE',
      'activate test',
    );
    await expect(
      service.transitionMerchant(
        context(superActor),
        merchant.id,
        'TERMINATE',
        'invalid direct terminate',
      ),
    ).rejects.toMatchObject({ code: 'MERCHANT_INVALID_STATE' });
    await service.transitionMerchant(
      context(superActor),
      merchant.id,
      'SUSPEND',
      'suspend test',
    );
    await service.transitionMerchant(
      context(superActor),
      merchant.id,
      'FREEZE',
      'freeze test',
    );
    await service.transitionMerchant(
      context(superActor),
      merchant.id,
      'RESTORE',
      'restore test',
    );
    await service.transitionMerchant(
      context(superActor),
      merchant.id,
      'SUSPEND',
      'suspend before terminate',
    );
    const terminated = await service.transitionMerchant(
      context(superActor),
      merchant.id,
      'TERMINATE',
      'terminate test',
    );
    expect(terminated.status).toBe('TERMINATED');
    await expect(
      service.transitionMerchant(
        context(superActor),
        merchant.id,
        'ACTIVATE',
        'terminal',
      ),
    ).rejects.toMatchObject({ code: 'MERCHANT_INVALID_STATE' });
    expect(
      await prisma.auditLog.count({
        where: { merchantId: merchant.id, action: { startsWith: 'MERCHANT_' } },
      }),
    ).toBe(7);
  });

  it('creates and updates tenant-owned Brands and rejects cross-tenant Store linkage', async () => {
    const merchantA = await createMerchant('BRAND-A');
    const merchantB = await createMerchant('BRAND-B');
    const brand = await service.createBrand(context(superActor), merchantA.id, {
      brandCode: 'MAIN',
      name: 'Main Brand',
    });
    const updated = await service.updateBrand(context(superActor), brand.id, {
      name: 'Updated Brand',
    });
    expect(updated.name).toBe('Updated Brand');
    await expect(
      service.createStore(context(superActor), merchantB.id, {
        brandId: brand.id,
        storeCode: 'CROSS',
        name: 'Cross',
        address: 'Cross',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(
      await prisma.auditLog.count({
        where: { merchantId: merchantA.id, targetType: 'BRAND' },
      }),
    ).toBe(2);
  });

  it('supports Platform Store create/read/update/suspend/close and audits mutations', async () => {
    const merchant = await createMerchant('STORE');
    const brand = await service.createBrand(context(superActor), merchant.id, {
      brandCode: 'STORE-BRAND',
      name: 'Store Brand',
    });
    const store = await service.createStore(context(superActor), merchant.id, {
      brandId: brand.id,
      storeCode: 'STORE-1',
      name: 'Store One',
      address: 'Address One',
    });
    expect((await service.getStore(reviewerActor, store.id)).id).toBe(store.id);
    await service.updateStore(context(superActor), store.id, {
      name: 'Store Updated',
    });
    await service.suspendStore(context(superActor), store.id, 'suspend test');
    const closed = await service.closeStore(
      context(superActor),
      store.id,
      'close test',
    );
    expect(closed.status).toBe('CLOSED');
    expect(
      await prisma.auditLog.count({
        where: { merchantId: merchant.id, targetType: 'STORE' },
      }),
    ).toBe(4);
  });

  it('allows only Super Admin capability management and prevents self elevation', async () => {
    const merchant = await createMerchant('CAPABILITY');
    const changed = await service.updateCapability(
      context(superActor),
      merchant.id,
      { canAcceptOrder: true },
      'enable after review',
    );
    expect(changed).toMatchObject({ canAcceptOrder: true, version: 2 });
    await expect(
      service.updateCapability(
        context(reviewerActor),
        merchant.id,
        { canAcceptPayment: true },
        'reviewer denied',
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const merchantActor: StaffActorContext = {
      actorId: randomUUID(),
      actorType: 'STAFF',
      sessionId: randomUUID(),
      merchantId: merchant.id,
      roleCode: 'MERCHANT_ADMIN',
      permissions: new Set(['merchant_capability.manage']),
      primaryStoreId: null,
      storeIds: [],
    };
    await expect(
      service.updateCapability(
        context(merchantActor),
        merchant.id,
        { canAcceptPayment: true },
        'self denied',
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(
      await prisma.auditLog.count({
        where: {
          merchantId: merchant.id,
          action: 'MERCHANT_CAPABILITY_CHANGE',
        },
      }),
    ).toBe(1);
  });

  it('builds trusted multi-store Bootstrap without cross-tenant leakage', async () => {
    const merchantA = await createMerchant('BOOT-A');
    const merchantB = await createMerchant('BOOT-B');
    const brandA = await service.createBrand(
      context(superActor),
      merchantA.id,
      { brandCode: 'BOOT-A', name: 'Brand A' },
    );
    const brandB = await service.createBrand(
      context(superActor),
      merchantB.id,
      { brandCode: 'BOOT-B', name: 'Brand B' },
    );
    const storeA1 = await service.createStore(
      context(superActor),
      merchantA.id,
      { brandId: brandA.id, storeCode: 'A1', name: 'A1', address: 'A1' },
    );
    const storeA2 = await service.createStore(
      context(superActor),
      merchantA.id,
      { brandId: brandA.id, storeCode: 'A2', name: 'A2', address: 'A2' },
    );
    await service.createStore(context(superActor), merchantB.id, {
      brandId: brandB.id,
      storeCode: 'B1',
      name: 'B1',
      address: 'B1',
    });
    const role = await prisma.role.create({
      data: {
        merchantId: merchantA.id,
        roleCode: 'MERCHANT_ADMIN',
        name: 'Merchant Admin',
      },
    });
    const staff = await prisma.staff.create({
      data: {
        merchantId: merchantA.id,
        roleId: role.id,
        primaryStoreId: storeA1.id,
        staffCode: `STAFF-${testRun}`,
        displayName: 'Multi Staff',
        status: 'ACTIVE',
      },
    });
    await prisma.staffStoreAssignment.createMany({
      data: [
        {
          merchantId: merchantA.id,
          staffId: staff.id,
          storeId: storeA1.id,
          status: 'ACTIVE',
        },
        {
          merchantId: merchantA.id,
          staffId: staff.id,
          storeId: storeA2.id,
          status: 'ACTIVE',
        },
      ],
    });
    await prisma.featureFlag.create({
      data: {
        scopeType: 'MERCHANT',
        scopeId: merchantA.id,
        featureCode: 'bootstrap.test',
        enabled: true,
      },
    });
    const actor: StaffActorContext = {
      actorId: staff.id,
      actorType: 'STAFF',
      sessionId: randomUUID(),
      merchantId: merchantA.id,
      roleCode: role.roleCode,
      permissions: new Set(['store.view']),
      primaryStoreId: storeA1.id,
      storeIds: [storeA1.id, storeA2.id],
    };
    const result = await bootstrapService.bootstrap(context(actor));
    expect(result.merchant.id).toBe(merchantA.id);
    expect(result.stores.map((store) => store.id)).toEqual([
      storeA1.id,
      storeA2.id,
    ]);
    expect(result.primaryStore?.id).toBe(storeA1.id);
    expect(
      result.brands.every((brand) => brand.merchantId === merchantA.id),
    ).toBe(true);
    expect(
      result.stores.every((store) => store.merchantId === merchantA.id),
    ).toBe(true);
    expect(result.featureFlags).toEqual([
      { featureCode: 'bootstrap.test', enabled: true, configJson: null },
    ]);
  });
});
