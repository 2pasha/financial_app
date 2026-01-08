import { Module } from '@nestjs/common';
import { MonobankController } from './monobank.controller';
import { MonobankService } from './monobank.service';
import { MonobankApiService } from './monobank-api.service';

@Module({
  controllers: [MonobankController],
  providers: [MonobankService, MonobankApiService],
  exports: [MonobankService],
})
export class MonobankModule {}
