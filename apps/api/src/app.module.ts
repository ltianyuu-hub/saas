import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { MerchantBusinessModule } from './merchant/merchant-business.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [SecurityModule, MerchantBusinessModule],
  controllers: [AppController],
})
export class AppModule {}
