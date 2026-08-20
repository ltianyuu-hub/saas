import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { createPrismaClient } from '@saas/database';
import {
  PermissionChecker,
  PrismaIdentityResolver,
  PrismaSessionRepository,
  PrismaTenantResourceRepository,
  SessionService,
  TenantContextService,
  defaultSessionTtlMs,
} from '@saas/identity-access';

import { AuthenticationGuard } from './authentication.guard';
import { PermissionGuard } from './permission.guard';
import { SecurityExceptionFilter } from './security-exception.filter';
import { SecurityController } from './security.controller';
import {
  PERMISSION_CHECKER,
  SESSION_SERVICE,
  TENANT_CONTEXT_SERVICE,
} from './security.tokens';
import { MerchantTenantGuard, PlatformContextGuard } from './tenant.guards';

const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

function sessionTtlMs(): number {
  const seconds = Number.parseInt(
    process.env.AUTH_SESSION_TTL_SECONDS ?? '',
    10,
  );
  return Number.isSafeInteger(seconds) && seconds > 0
    ? seconds * 1000
    : defaultSessionTtlMs;
}

@Module({
  controllers: [SecurityController],
  providers: [
    {
      provide: PRISMA_CLIENT,
      useFactory: () => createPrismaClient(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: PERMISSION_CHECKER,
      useFactory: () => new PermissionChecker(),
    },
    {
      inject: [PRISMA_CLIENT],
      provide: SESSION_SERVICE,
      useFactory: (prisma: ReturnType<typeof createPrismaClient>) =>
        new SessionService(
          new PrismaSessionRepository(prisma),
          new PrismaIdentityResolver(prisma),
          sessionTtlMs(),
        ),
    },
    {
      inject: [PRISMA_CLIENT, PERMISSION_CHECKER],
      provide: TENANT_CONTEXT_SERVICE,
      useFactory: (
        prisma: ReturnType<typeof createPrismaClient>,
        permissions: PermissionChecker,
      ) =>
        new TenantContextService(
          new PrismaTenantResourceRepository(prisma),
          permissions,
        ),
    },
    AuthenticationGuard,
    MerchantTenantGuard,
    PlatformContextGuard,
    PermissionGuard,
    { provide: APP_FILTER, useClass: SecurityExceptionFilter },
  ],
  exports: [
    PERMISSION_CHECKER,
    SESSION_SERVICE,
    TENANT_CONTEXT_SERVICE,
    AuthenticationGuard,
    MerchantTenantGuard,
    PlatformContextGuard,
    PermissionGuard,
  ],
})
export class SecurityModule {}
