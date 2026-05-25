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
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { CreateTripItemDto } from './dto/create-trip-item.dto';
import { UpdateTripItemDto } from './dto/update-trip-item.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('trips')
@UseGuards(ClerkAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.tripsService.findAll(user.clerkId);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body(ValidationPipe) dto: CreateTripDto,
  ) {
    return this.tripsService.create(user.clerkId, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.tripsService.findOne(user.clerkId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateTripDto,
  ) {
    return this.tripsService.update(user.clerkId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.tripsService.remove(user.clerkId, id);
  }

  @Post(':id/items')
  addItem(
    @CurrentUser() user: CurrentUserData,
    @Param('id') tripId: string,
    @Body(ValidationPipe) dto: CreateTripItemDto,
  ) {
    return this.tripsService.addItem(user.clerkId, tripId, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @CurrentUser() user: CurrentUserData,
    @Param('id') tripId: string,
    @Param('itemId') itemId: string,
    @Body(ValidationPipe) dto: UpdateTripItemDto,
  ) {
    return this.tripsService.updateItem(user.clerkId, tripId, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @CurrentUser() user: CurrentUserData,
    @Param('id') tripId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.tripsService.removeItem(user.clerkId, tripId, itemId);
  }
}
