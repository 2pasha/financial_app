import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClerkThrottlerGuard } from './common/guards/clerk-throttler.guard';
import { DatabaseModule } from './database/database.module';
import { MonobankModule } from './modules/monobank/monobank.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { IncomeModule } from './modules/income/income.module';
import { BudgetPlansModule } from './modules/budget-plans/budget-plans.module';
import { TripsModule } from './modules/trips/trips.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Global rate-limit default: 100 requests per 60s per tracked identity.
    // Tighter per-endpoint limits are applied with @Throttle() on top of this.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    MonobankModule,
    CategoriesModule,
    TransactionsModule,
    IncomeModule,
    BudgetPlansModule,
    TripsModule,
    ExchangeRatesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Custom throttler guard (keys by clerkId, falls back to IP) applied globally.
    { provide: APP_GUARD, useClass: ClerkThrottlerGuard },
  ],
})
export class AppModule {}
