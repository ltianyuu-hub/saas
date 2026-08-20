import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { ActorContext, RequestContext } from '@saas/identity-access';
import type {
  CreateBrandInput,
  CreateMerchantInput,
  CreateStoreInput,
  MerchantApplicationService,
  MerchantBootstrapService,
  UpdateBrandInput,
  UpdateCapabilityInput,
  UpdateStoreInput,
} from '@saas/merchant';

import { AuthenticationGuard } from '../security/authentication.guard';
import {
  CurrentActor,
  CurrentRequestContext,
} from '../security/current-context.decorators';
import {
  PermissionGuard,
  RequirePermission,
} from '../security/permission.guard';
import {
  MerchantTenantGuard,
  PlatformContextGuard,
} from '../security/tenant.guards';
import {
  MERCHANT_APPLICATION,
  MERCHANT_BOOTSTRAP,
} from './merchant-business.module';

interface ReasonBody {
  reason: string;
}
interface CapabilityBody extends UpdateCapabilityInput {
  reason: string;
}

@Controller('api/v1/platform')
@UseGuards(AuthenticationGuard, PlatformContextGuard, PermissionGuard)
export class PlatformMerchantController {
  constructor(
    @Inject(MERCHANT_APPLICATION)
    private readonly service: MerchantApplicationService,
  ) {}

  @Get('merchants')
  @RequirePermission('merchant.view')
  listMerchants(@CurrentActor() actor: ActorContext) {
    return this.service.listMerchants(actor);
  }

  @Post('merchants')
  @RequirePermission('merchant.create')
  createMerchant(
    @CurrentRequestContext() context: RequestContext,
    @Body() input: CreateMerchantInput,
  ) {
    return this.service.createMerchant(context, input);
  }

  @Get('merchants/:id')
  @RequirePermission('merchant.view')
  getMerchant(@CurrentActor() actor: ActorContext, @Param('id') id: string) {
    return this.service.getMerchant(actor, id);
  }

  @Post('merchants/:id/activate')
  @RequirePermission('merchant.lifecycle.manage')
  activate(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() body: ReasonBody,
  ) {
    return this.service.transitionMerchant(
      context,
      id,
      'ACTIVATE',
      body.reason,
    );
  }

  @Post('merchants/:id/suspend')
  @RequirePermission('merchant.lifecycle.manage')
  suspend(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() body: ReasonBody,
  ) {
    return this.service.transitionMerchant(context, id, 'SUSPEND', body.reason);
  }

  @Post('merchants/:id/freeze')
  @RequirePermission('merchant.lifecycle.manage')
  freeze(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() body: ReasonBody,
  ) {
    return this.service.transitionMerchant(context, id, 'FREEZE', body.reason);
  }

  @Post('merchants/:id/restore')
  @RequirePermission('merchant.lifecycle.manage')
  restore(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() body: ReasonBody,
  ) {
    return this.service.transitionMerchant(context, id, 'RESTORE', body.reason);
  }

  @Post('merchants/:id/terminate')
  @RequirePermission('merchant.lifecycle.manage')
  terminate(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() body: ReasonBody,
  ) {
    return this.service.transitionMerchant(
      context,
      id,
      'TERMINATE',
      body.reason,
    );
  }

  @Post('merchants/:id/brands')
  @RequirePermission('brand.manage')
  createBrand(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() input: CreateBrandInput,
  ) {
    return this.service.createBrand(context, id, input);
  }

  @Get('brands/:id')
  @RequirePermission('brand.view')
  getBrand(@CurrentActor() actor: ActorContext, @Param('id') id: string) {
    return this.service.getBrand(actor, id);
  }

  @Put('brands/:id')
  @RequirePermission('brand.manage')
  updateBrand(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() input: UpdateBrandInput,
  ) {
    return this.service.updateBrand(context, id, input);
  }

  @Post('merchants/:id/stores')
  @RequirePermission('store.manage')
  createStore(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() input: CreateStoreInput,
  ) {
    return this.service.createStore(context, id, input);
  }

  @Get('stores/:id')
  @RequirePermission('store.view')
  getStore(@CurrentActor() actor: ActorContext, @Param('id') id: string) {
    return this.service.getStore(actor, id);
  }

  @Put('stores/:id')
  @RequirePermission('store.manage')
  updateStore(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() input: UpdateStoreInput,
  ) {
    return this.service.updateStore(context, id, input);
  }

  @Post('stores/:id/suspend')
  @RequirePermission('store.manage')
  suspendStore(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() body: ReasonBody,
  ) {
    return this.service.suspendStore(context, id, body.reason);
  }

  @Post('stores/:id/close')
  @RequirePermission('store.manage')
  closeStore(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() body: ReasonBody,
  ) {
    return this.service.closeStore(context, id, body.reason);
  }

  @Get('merchants/:id/capability')
  @RequirePermission('merchant_capability.view')
  getCapability(@CurrentActor() actor: ActorContext, @Param('id') id: string) {
    return this.service.getCapability(actor, id);
  }

  @Put('merchants/:id/capability')
  @RequirePermission('merchant_capability.manage')
  updateCapability(
    @CurrentRequestContext() context: RequestContext,
    @Param('id') id: string,
    @Body() body: CapabilityBody,
  ) {
    const { reason, ...input } = body;
    return this.service.updateCapability(context, id, input, reason);
  }
}

@Controller('api/v1/merchant')
@UseGuards(AuthenticationGuard, MerchantTenantGuard)
export class MerchantController {
  constructor(
    @Inject(MERCHANT_BOOTSTRAP)
    private readonly bootstrapService: MerchantBootstrapService,
  ) {}

  @Get('bootstrap')
  bootstrap(@CurrentRequestContext() context: RequestContext) {
    return this.bootstrapService.bootstrap(context);
  }

  @Get('stores')
  stores(@CurrentRequestContext() context: RequestContext) {
    return this.bootstrapService.listAccessibleStores(context);
  }
}
