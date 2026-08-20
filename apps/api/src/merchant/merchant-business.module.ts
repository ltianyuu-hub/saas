import { Module } from '@nestjs/common';
import { createPrismaClient } from '@saas/database';
import {
  MerchantApplicationService,
  MerchantBootstrapService,
} from '@saas/merchant';

import { SecurityModule } from '../security/security.module';
import {
  MerchantController,
  PlatformMerchantController,
} from './merchant.controller';

const MERCHANT_PRISMA = Symbol('MERCHANT_PRISMA');
export const MERCHANT_APPLICATION = Symbol('MERCHANT_APPLICATION');
export const MERCHANT_BOOTSTRAP = Symbol('MERCHANT_BOOTSTRAP');

@Module({
  imports: [SecurityModule],
  controllers: [PlatformMerchantController, MerchantController],
  providers: [
    {
      provide: MERCHANT_PRISMA,
      useFactory: () => createPrismaClient(process.env.DATABASE_URL ?? ''),
    },
    {
      provide: MERCHANT_APPLICATION,
      inject: [MERCHANT_PRISMA],
      useFactory: (prisma: ReturnType<typeof createPrismaClient>) =>
        new MerchantApplicationService(prisma),
    },
    {
      provide: MERCHANT_BOOTSTRAP,
      inject: [MERCHANT_PRISMA],
      useFactory: (prisma: ReturnType<typeof createPrismaClient>) =>
        new MerchantBootstrapService(prisma),
    },
  ],
})
export class MerchantBusinessModule {}
