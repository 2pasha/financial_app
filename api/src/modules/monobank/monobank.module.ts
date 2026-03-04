import { Module } from '@nestjs/common';
import { MonobankController } from './monobank.controller';
import { MonobankService } from './monobank.service';
import { MonobankApiService } from './monobank-api.service';
import { CryptoService } from '../../common/services/crypto.service';
import { SyncJobStore } from './sync-job.store';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [MonobankController],
  providers: [MonobankService, MonobankApiService, CryptoService, SyncJobStore],
  exports: [MonobankService],
})
export class MonobankModule {}
