import type { Prisma, PrismaClient, TransactionClient } from '@saas/database';
import {
  PermissionChecker,
  SecurityError,
  securityErrorCodes,
  type ActorContext,
  type RequestContext,
  type StaffActorContext,
} from '@saas/identity-access';

import {
  initialMerchantStatus,
  MerchantLifecycleError,
  MerchantLifecyclePolicy,
  type MerchantLifecycleAction,
  type MerchantStatus,
} from './merchant-lifecycle';

export interface CreateMerchantInput {
  merchantCode: string;
  displayName: string;
  legalEntityName: string;
  businessLicenseNo?: string;
  contactName: string;
  contactPhone: string;
}

export interface CreateBrandInput {
  brandCode: string;
  name: string;
  logoFileId?: string | null;
}

export interface UpdateBrandInput {
  name?: string;
  logoFileId?: string | null;
}

export interface CreateStoreInput {
  brandId: string;
  storeCode: string;
  name: string;
  address: string;
  longitude?: number | null;
  latitude?: number | null;
  contactPhone?: string | null;
  businessHoursJson?: Prisma.InputJsonValue;
}

export interface UpdateStoreInput {
  name?: string;
  address?: string;
  longitude?: number | null;
  latitude?: number | null;
  contactPhone?: string | null;
  businessHoursJson?: Prisma.InputJsonValue;
}

export interface UpdateCapabilityInput {
  canCreateProduct?: boolean;
  canPublishProduct?: boolean;
  canAcceptOrder?: boolean;
  canAcceptPayment?: boolean;
  canRedeemVoucher?: boolean;
  canProcessRefund?: boolean;
}

export class MerchantBusinessError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: 400 | 409,
  ) {
    super(message);
    this.name = 'MerchantBusinessError';
  }
}

const merchantSelect = {
  id: true,
  merchantCode: true,
  displayName: true,
  legalEntityName: true,
  businessLicenseNo: true,
  contactName: true,
  contactPhone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const brandSelect = {
  id: true,
  merchantId: true,
  brandCode: true,
  name: true,
  logoFileId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const storeSelect = {
  id: true,
  merchantId: true,
  brandId: true,
  storeCode: true,
  name: true,
  address: true,
  longitude: true,
  latitude: true,
  contactPhone: true,
  businessHoursJson: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const capabilitySelect = {
  merchantId: true,
  canCreateProduct: true,
  canPublishProduct: true,
  canAcceptOrder: true,
  canAcceptPayment: true,
  canRedeemVoucher: true,
  canProcessRefund: true,
  version: true,
} as const;

export class MerchantApplicationService {
  private readonly lifecycle = new MerchantLifecyclePolicy();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly permissions = new PermissionChecker(),
  ) {}

  async createMerchant(context: RequestContext, input: CreateMerchantInput) {
    this.require(context.actor, 'merchant.create');
    return this.prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: { ...input, status: initialMerchantStatus },
        select: merchantSelect,
      });
      await tx.merchantCapability.create({ data: { merchantId: merchant.id } });
      await this.audit(tx, context, {
        action: 'MERCHANT_CREATE',
        merchantId: merchant.id,
        targetType: 'MERCHANT',
        targetId: merchant.id,
        afterJson: merchant,
      });
      return merchant;
    });
  }

  async listMerchants(actor: ActorContext) {
    this.require(actor, 'merchant.view');
    return this.prisma.merchant.findMany({
      select: merchantSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMerchant(actor: ActorContext, merchantId: string) {
    this.require(actor, 'merchant.view');
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: merchantSelect,
    });
    return merchant ?? this.notFound();
  }

  async transitionMerchant(
    context: RequestContext,
    merchantId: string,
    action: MerchantLifecycleAction,
    reason: string,
  ) {
    this.require(context.actor, 'merchant.lifecycle.manage');
    this.requireReason(reason);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.merchant.findUnique({
        where: { id: merchantId },
        select: merchantSelect,
      });
      if (!current) return this.notFound();
      let nextStatus: MerchantStatus;
      try {
        nextStatus = this.lifecycle.transition(current.status, action);
      } catch (error) {
        if (error instanceof MerchantLifecycleError) {
          throw new MerchantBusinessError(error.code, error.message, 409);
        }
        throw error;
      }
      const updated = await tx.merchant.update({
        where: { id: merchantId },
        data: { status: nextStatus },
        select: merchantSelect,
      });
      await this.audit(tx, context, {
        action: `MERCHANT_${action}`,
        merchantId,
        targetType: 'MERCHANT',
        targetId: merchantId,
        beforeJson: current,
        afterJson: updated,
        reason,
      });
      return updated;
    });
  }

  async createBrand(
    context: RequestContext,
    merchantId: string,
    input: CreateBrandInput,
  ) {
    this.require(context.actor, 'brand.manage');
    await this.ensureMerchant(merchantId);
    return this.prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: { ...input, merchantId, status: 'ACTIVE' },
        select: brandSelect,
      });
      await this.audit(tx, context, {
        action: 'BRAND_CREATE',
        merchantId,
        targetType: 'BRAND',
        targetId: brand.id,
        afterJson: brand,
      });
      return brand;
    });
  }

  async getBrand(actor: ActorContext, brandId: string) {
    this.require(actor, 'brand.view');
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: brandSelect,
    });
    return brand ?? this.notFound();
  }

  async updateBrand(
    context: RequestContext,
    brandId: string,
    input: UpdateBrandInput,
  ) {
    this.require(context.actor, 'brand.manage');
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.brand.findUnique({
        where: { id: brandId },
        select: brandSelect,
      });
      if (!current) return this.notFound();
      const updated = await tx.brand.update({
        where: { id: brandId },
        data: input,
        select: brandSelect,
      });
      await this.audit(tx, context, {
        action: 'BRAND_UPDATE',
        merchantId: current.merchantId,
        targetType: 'BRAND',
        targetId: brandId,
        beforeJson: current,
        afterJson: updated,
      });
      return updated;
    });
  }

  async createStore(
    context: RequestContext,
    merchantId: string,
    input: CreateStoreInput,
  ) {
    this.require(context.actor, 'store.manage');
    const brand = await this.prisma.brand.findFirst({
      where: { id: input.brandId, merchantId },
      select: { id: true },
    });
    if (!brand) return this.notFound();
    return this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: { ...input, merchantId, status: 'ACTIVE' },
        select: storeSelect,
      });
      await this.audit(tx, context, {
        action: 'STORE_CREATE',
        merchantId,
        targetType: 'STORE',
        targetId: store.id,
        afterJson: store,
      });
      return store;
    });
  }

  async getStore(actor: ActorContext, storeId: string) {
    this.require(actor, 'store.view');
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: storeSelect,
    });
    return store ?? this.notFound();
  }

  async updateStore(
    context: RequestContext,
    storeId: string,
    input: UpdateStoreInput,
  ) {
    this.require(context.actor, 'store.manage');
    return this.mutateStore(context, storeId, 'STORE_UPDATE', input);
  }

  async suspendStore(context: RequestContext, storeId: string, reason: string) {
    this.require(context.actor, 'store.manage');
    this.requireReason(reason);
    return this.mutateStore(
      context,
      storeId,
      'STORE_SUSPEND',
      { status: 'SUSPENDED' },
      reason,
      ['ACTIVE'],
    );
  }

  async closeStore(context: RequestContext, storeId: string, reason: string) {
    this.require(context.actor, 'store.manage');
    this.requireReason(reason);
    return this.mutateStore(
      context,
      storeId,
      'STORE_CLOSE',
      { status: 'CLOSED' },
      reason,
      ['ACTIVE', 'SUSPENDED'],
    );
  }

  async getCapability(actor: ActorContext, merchantId: string) {
    this.require(actor, 'merchant_capability.view');
    const capability = await this.prisma.merchantCapability.findUnique({
      where: { merchantId },
      select: capabilitySelect,
    });
    return capability ?? this.notFound();
  }

  async updateCapability(
    context: RequestContext,
    merchantId: string,
    input: UpdateCapabilityInput,
    reason: string,
  ) {
    this.require(context.actor, 'merchant_capability.manage');
    this.requireReason(reason);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.merchantCapability.findUnique({
        where: { merchantId },
        select: capabilitySelect,
      });
      if (!current) return this.notFound();
      const updated = await tx.merchantCapability.update({
        where: { merchantId },
        data: { ...input, version: { increment: 1 } },
        select: capabilitySelect,
      });
      await this.audit(tx, context, {
        action: 'MERCHANT_CAPABILITY_CHANGE',
        merchantId,
        targetType: 'MERCHANT_CAPABILITY',
        targetId: merchantId,
        beforeJson: current,
        afterJson: updated,
        reason,
      });
      return updated;
    });
  }

  private async mutateStore(
    context: RequestContext,
    storeId: string,
    action: string,
    data: UpdateStoreInput & { status?: 'SUSPENDED' | 'CLOSED' },
    reason?: string,
    allowedStatuses?: readonly string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.store.findUnique({
        where: { id: storeId },
        select: storeSelect,
      });
      if (!current) return this.notFound();
      if (allowedStatuses && !allowedStatuses.includes(current.status)) {
        throw new MerchantBusinessError(
          'STORE_INVALID_STATE',
          `Store action is invalid from ${current.status}.`,
          409,
        );
      }
      const updated = await tx.store.update({
        where: { id: storeId },
        data,
        select: storeSelect,
      });
      await this.audit(tx, context, {
        action,
        merchantId: current.merchantId,
        targetType: 'STORE',
        targetId: storeId,
        beforeJson: current,
        afterJson: updated,
        ...(reason === undefined ? {} : { reason }),
      });
      return updated;
    });
  }

  private require(actor: ActorContext, permission: string): void {
    this.permissions.requirePlatform(actor);
    this.permissions.require(actor, permission);
  }

  private requireReason(reason: string): void {
    if (reason.trim().length === 0)
      throw new MerchantBusinessError(
        'VALIDATION_ERROR',
        'A reason is required.',
        400,
      );
  }

  private async ensureMerchant(merchantId: string): Promise<void> {
    if (
      !(await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true },
      }))
    )
      this.notFound();
  }

  private notFound(): never {
    throw new SecurityError(
      securityErrorCodes.resourceNotFound,
      'The requested resource was not found.',
      404,
    );
  }

  private async audit(
    tx: TransactionClient,
    context: RequestContext,
    input: {
      action: string;
      merchantId: string;
      targetType: string;
      targetId: string;
      beforeJson?: object;
      afterJson?: object;
      reason?: string;
    },
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorType: context.actor.actorType,
        actorId: context.actor.actorId,
        merchantId: input.merchantId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        ...(input.beforeJson === undefined
          ? {}
          : { beforeJson: this.toAuditJson(input.beforeJson) }),
        ...(input.afterJson === undefined
          ? {}
          : { afterJson: this.toAuditJson(input.afterJson) }),
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        requestId: context.requestId,
        correlationId: context.correlationId,
      },
    });
  }

  private toAuditJson(value: object): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}

export class MerchantBootstrapService {
  constructor(private readonly prisma: PrismaClient) {}

  async bootstrap(context: RequestContext) {
    const actor = this.requireStaff(context.actor);
    const staff = await this.prisma.staff.findFirst({
      where: { id: actor.actorId, merchantId: actor.merchantId },
      select: {
        id: true,
        staffCode: true,
        displayName: true,
        status: true,
        primaryStoreId: true,
        merchant: { select: merchantSelect },
        role: { select: { id: true, roleCode: true, name: true } },
      },
    });
    if (!staff) return this.notFound();
    const [brands, stores, capability, featureFlags] = await Promise.all([
      this.prisma.brand.findMany({
        where: { merchantId: actor.merchantId },
        select: brandSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.store.findMany({
        where: {
          merchantId: actor.merchantId,
          id: { in: [...actor.storeIds] },
        },
        select: storeSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.merchantCapability.findUnique({
        where: { merchantId: actor.merchantId },
        select: capabilitySelect,
      }),
      this.prisma.featureFlag.findMany({
        where: { scopeType: 'MERCHANT', scopeId: actor.merchantId },
        select: { featureCode: true, enabled: true, configJson: true },
        orderBy: { featureCode: 'asc' },
      }),
    ]);
    return {
      actor: { actorId: actor.actorId, actorType: actor.actorType },
      staff,
      merchant: staff.merchant,
      brands,
      stores,
      primaryStore:
        stores.find((store) => store.id === actor.primaryStoreId) ?? null,
      storeScope: { storeIds: [...actor.storeIds] },
      role: staff.role,
      permissions: [...actor.permissions].sort(),
      merchantCapability: capability,
      featureFlags,
    };
  }

  async listAccessibleStores(context: RequestContext) {
    const actor = this.requireStaff(context.actor);
    return this.prisma.store.findMany({
      where: { merchantId: actor.merchantId, id: { in: [...actor.storeIds] } },
      select: storeSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  private requireStaff(actor: ActorContext): StaffActorContext {
    if (actor.actorType !== 'STAFF')
      throw new SecurityError(
        securityErrorCodes.forbidden,
        'A Staff actor is required.',
        403,
      );
    return actor;
  }

  private notFound(): never {
    throw new SecurityError(
      securityErrorCodes.resourceNotFound,
      'The requested resource was not found.',
      404,
    );
  }
}
