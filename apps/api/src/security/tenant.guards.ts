import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  SecurityError,
  securityErrorCodes,
  type PermissionChecker,
  type TenantContextService,
} from '@saas/identity-access';

import type { SecurityRequest } from './security-request';
import { PERMISSION_CHECKER, TENANT_CONTEXT_SERVICE } from './security.tokens';

@Injectable()
export class MerchantTenantGuard implements CanActivate {
  constructor(
    @Inject(TENANT_CONTEXT_SERVICE)
    private readonly tenants: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SecurityRequest>();
    if (!request.security) {
      throw new SecurityError(
        securityErrorCodes.unauthenticated,
        'Authentication is required.',
        401,
      );
    }
    const tenant = this.tenants.fromStaff(request.security.actor);
    request.security.tenant = tenant;
    request.security.requestContext.tenant = tenant;
    return true;
  }
}

@Injectable()
export class PlatformContextGuard implements CanActivate {
  constructor(
    @Inject(PERMISSION_CHECKER)
    private readonly permissions: PermissionChecker,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SecurityRequest>();
    if (!request.security) {
      throw new SecurityError(
        securityErrorCodes.unauthenticated,
        'Authentication is required.',
        401,
      );
    }
    this.permissions.requirePlatform(request.security.actor);
    return true;
  }
}
