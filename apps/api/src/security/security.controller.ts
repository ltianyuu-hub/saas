import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  ActorContext,
  SessionService,
  TenantContext,
  TenantContextService,
} from '@saas/identity-access';

import { AuthenticationGuard, bearerToken } from './authentication.guard';
import { CurrentActor, CurrentTenant } from './current-context.decorators';
import { PermissionGuard, RequirePermission } from './permission.guard';
import type { SecurityRequest } from './security-request';
import { SESSION_SERVICE, TENANT_CONTEXT_SERVICE } from './security.tokens';
import { MerchantTenantGuard, PlatformContextGuard } from './tenant.guards';

@Controller('api/v1')
export class SecurityController {
  constructor(
    @Inject(SESSION_SERVICE) private readonly sessions: SessionService,
    @Inject(TENANT_CONTEXT_SERVICE)
    private readonly tenants: TenantContextService,
  ) {}

  @Post('auth/logout')
  @UseGuards(AuthenticationGuard)
  async logout(
    @Req() request: SecurityRequest,
  ): Promise<{ data: { revoked: true }; request_id: string }> {
    await this.sessions.revoke(bearerToken(request));
    return {
      data: { revoked: true },
      request_id: request.security!.requestContext.requestId,
    };
  }

  @Get('merchant/security/context')
  @UseGuards(AuthenticationGuard, MerchantTenantGuard)
  merchantContext(
    @CurrentActor() actor: ActorContext,
    @CurrentTenant() tenant: TenantContext,
    @Req() request: SecurityRequest,
  ): {
    data: { actorId: string; merchantId: string };
    request_id: string;
  } {
    return {
      data: { actorId: actor.actorId, merchantId: tenant.merchantId },
      request_id: request.security!.requestContext.requestId,
    };
  }

  @Get('platform/security/context')
  @RequirePermission('merchant.view')
  @UseGuards(AuthenticationGuard, PlatformContextGuard, PermissionGuard)
  platformContext(
    @CurrentActor() actor: ActorContext,
    @Req() request: SecurityRequest,
  ): {
    data: { actorId: string; actorType: string };
    request_id: string;
  } {
    return {
      data: { actorId: actor.actorId, actorType: actor.actorType },
      request_id: request.security!.requestContext.requestId,
    };
  }

  @Get('platform/security/merchants/:merchantId/context')
  @RequirePermission('merchant.view')
  @UseGuards(AuthenticationGuard, PlatformContextGuard, PermissionGuard)
  async targetTenant(
    @CurrentActor() actor: ActorContext,
    @Param('merchantId') merchantId: string,
    @Req() request: SecurityRequest,
  ): Promise<{ data: TenantContext; request_id: string }> {
    return {
      data: await this.tenants.fromPlatformTarget(
        actor,
        merchantId,
        'merchant.view',
      ),
      request_id: request.security!.requestContext.requestId,
    };
  }
}
