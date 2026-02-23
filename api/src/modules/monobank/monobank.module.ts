import { Module } from '@nestjs/common';
import { MonobankController } from './monobank.controller';
import { MonobankService } from './monobank.service';
import { MonobankApiService } from './monobank-api.service';
import { CryptoService } from '../../common/services/crypto.service';

@Module({
  controllers: [MonobankController],
  providers: [MonobankService, MonobankApiService, CryptoService],
  exports: [MonobankService],
})
export class MonobankModule {}
