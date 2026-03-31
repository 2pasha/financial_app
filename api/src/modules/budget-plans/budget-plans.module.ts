import { Module } from '@nestjs/common';
import { BudgetPlansService } from './budget-plans.service';
import { BudgetPlansController } from './budget-plans.controller';

@Module({
  controllers: [BudgetPlansController],
  providers: [BudgetPlansService],
})
export class BudgetPlansModule {}
