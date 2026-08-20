import type { ActorContext, StaffActorContext, TenantContext } from './context';
import { PermissionChecker } from './permissions';
import type { TenantResourceRepository } from './ports';
import { SecurityError, securityErrorCodes } from './security-error';

export class TenantContextService {
  constructor(
    private readonly resources: TenantResourceRepository,
    private readonly permissions: PermissionChecker,
  ) {}

  fromStaff(actor: ActorContext): TenantContext {
    if (actor.actorType !== 'STAFF') {
      throw new SecurityError(
        securityErrorCodes.invalidTenantContext,
        'A Staff actor is required for Merchant tenant context.',
        403,
      );
    }
    return { merchantId: actor.merchantId, source: 'STAFF_SESSION' };
  }

  async fromPlatformTarget(
    actor: ActorContext,
    targetMerchantId: string,
    requiredPermission: string,
  ): Promise<TenantContext> {
    const platform = this.permissions.requirePlatform(actor);
    this.permissions.require(platform, requiredPermission);
    if (!(await this.resources.merchantExists(targetMerchantId))) {
      throw new SecurityError(
        securityErrorCodes.resourceNotFound,
        'The requested resource was not found.',
        404,
      );
    }
    return { merchantId: targetMerchantId, source: 'PLATFORM_TARGET' };
  }

  requireStore(actor: StaffActorContext, storeId: string): void {
    if (!actor.storeIds.includes(storeId)) {
      throw new SecurityError(
        securityErrorCodes.forbidden,
        'The Store is outside the current Staff scope.',
        403,
      );
    }
  }

  async requireStaffResource(
    tenant: TenantContext,
    staffId: string,
  ): Promise<void> {
    if (
      !(await this.resources.staffExistsInTenant(staffId, tenant.merchantId))
    ) {
      this.notFound();
    }
  }

  async requireAssignmentResource(
    tenant: TenantContext,
    assignmentId: string,
  ): Promise<void> {
    if (
      !(await this.resources.assignmentExistsInTenant(
        assignmentId,
        tenant.merchantId,
      ))
    ) {
      this.notFound();
    }
  }

  private notFound(): never {
    throw new SecurityError(
      securityErrorCodes.resourceNotFound,
      'The requested resource was not found.',
      404,
    );
  }
}
