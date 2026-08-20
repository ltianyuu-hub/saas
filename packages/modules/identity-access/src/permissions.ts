import type { ActorContext, PlatformActorContext } from './context';
import { SecurityError, securityErrorCodes } from './security-error';

export const approvedRoleCodes = {
  platformSuperAdmin: 'PLATFORM_SUPER_ADMIN',
  platformReviewer: 'PLATFORM_REVIEWER',
  merchantAdmin: 'MERCHANT_ADMIN',
  merchantStaff: 'MERCHANT_STAFF',
} as const;

export const platformManagementPermissions = [
  'merchant.view',
  'merchant.create',
  'merchant.lifecycle.manage',
  'brand.view',
  'brand.manage',
  'store.view',
  'store.manage',
  'merchant_capability.view',
  'merchant_capability.manage',
] as const;

export const platformReviewerPermissions = [
  'merchant.view',
  'merchant.review',
  'brand.view',
  'store.view',
  'campaign.view',
  'campaign.review',
  'refund.view',
  'risk.view',
  'exception.view',
  'audit.view_limited',
] as const;

export const registeredPlatformPermissions = new Set([
  ...platformManagementPermissions,
  ...platformReviewerPermissions,
  'merchant.freeze',
  'platform_fee.manage',
]);

export class PermissionChecker {
  has(actor: ActorContext, permission: string): boolean {
    if (actor.actorType === 'CONSUMER') return false;
    if (
      actor.actorType === 'PLATFORM' &&
      actor.roleCode === approvedRoleCodes.platformSuperAdmin
    ) {
      return registeredPlatformPermissions.has(permission);
    }
    return actor.permissions.has(permission);
  }

  require(actor: ActorContext, permission: string): void {
    if (!this.has(actor, permission)) {
      throw new SecurityError(
        securityErrorCodes.forbidden,
        'The current actor does not have the required permission.',
        403,
      );
    }
  }

  requirePlatform(actor: ActorContext): PlatformActorContext {
    if (actor.actorType !== 'PLATFORM') {
      throw new SecurityError(
        securityErrorCodes.forbidden,
        'A Platform actor is required.',
        403,
      );
    }
    return actor;
  }
}
