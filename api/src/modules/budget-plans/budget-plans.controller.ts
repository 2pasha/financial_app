import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { BudgetPlansService } from './budget-plans.service';
import { UpsertBudgetPlanDto } from './dto/upsert-budget-plan.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('budget-plans')
@UseGuards(ClerkAuthGuard)
export class BudgetPlansController {
  constructor(private readonly budgetPlansService: BudgetPlansService) {}

  @Get()
  async findForMonth(
    @CurrentUser() user: CurrentUserData,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.budgetPlansService.findForMonth(user.clerkId, year, month);
  }

  @Post()
  async upsert(
    @CurrentUser() user: CurrentUserData,
    @Body(ValidationPipe) dto: UpsertBudgetPlanDto,
  ) {
    return this.budgetPlansService.upsert(user.clerkId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.budgetPlansService.delete(user.clerkId, id);
  }
}
