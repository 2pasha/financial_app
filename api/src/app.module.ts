import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MonobankModule } from './modules/monobank/monobank.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { IncomeModule } from './modules/income/income.module';
import { BudgetPlansModule } from './modules/budget-plans/budget-plans.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    MonobankModule,
    CategoriesModule,
    TransactionsModule,
    IncomeModule,
    BudgetPlansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
