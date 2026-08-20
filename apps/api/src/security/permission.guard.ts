import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SecurityError,
  securityErrorCodes,
  type PermissionChecker,
} from '@saas/identity-access';

import type { SecurityRequest } from './security-request';
import { PERMISSION_CHECKER } from './security.tokens';

export const REQUIRED_PERMISSION = 'security.required_permission';
export const RequirePermission = (
  permission: string,
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_PERMISSION, permission);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PERMISSION_CHECKER) private readonly permissions: PermissionChecker,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;
    const request = context.switchToHttp().getRequest<SecurityRequest>();
    if (!request.security) {
      throw new SecurityError(
        securityErrorCodes.unauthenticated,
        'Authentication is required.',
        401,
      );
    }
    this.permissions.require(request.security.actor, permission);
    return true;
  }
}
