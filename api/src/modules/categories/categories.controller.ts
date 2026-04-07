import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('categories')
@UseGuards(ClerkAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('calendarYear') calendarYearStr?: string,
    @Query('calendarMonth') calendarMonthStr?: string,
  ) {
    const parsedYear = calendarYearStr ? parseInt(calendarYearStr, 10) : NaN;
    const parsedMonth = calendarMonthStr ? parseInt(calendarMonthStr, 10) : NaN;
    const calendarYear = Number.isInteger(parsedYear) ? parsedYear : undefined;
    const calendarMonth = Number.isInteger(parsedMonth) ? parsedMonth : undefined;

    return this.categoriesService.findAllForUser(user.clerkId, from, to, calendarYear, calendarMonth);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body(ValidationPipe) dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(user.clerkId, dto);
  }

  @Get(':id/transactions')
  async getTransactions(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.categoriesService.getTransactionsForCategory(user.clerkId, id, from, to);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.clerkId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.categoriesService.delete(user.clerkId, id);
  }
}
