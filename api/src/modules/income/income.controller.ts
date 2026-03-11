import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IncomeService } from './income.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('income')
@UseGuards(ClerkAuthGuard)
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.incomeService.findAllForUser(user.clerkId);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body(ValidationPipe) dto: CreateIncomeDto,
  ) {
    return this.incomeService.create(user.clerkId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateIncomeDto,
  ) {
    return this.incomeService.update(user.clerkId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.incomeService.delete(user.clerkId, id);
  }
}
