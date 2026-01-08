import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { MonobankService } from './monobank.service';
import { SaveTokenDto } from './dto/save-token.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { clerkClient } from '@clerk/clerk-sdk-node';

@Controller('monobank')
@UseGuards(ClerkAuthGuard)
export class MonobankController {
  constructor(private readonly monobankService: MonobankService) {}

  @Post('token')
  async saveToken(
    @CurrentUser() user: CurrentUserData,
    @Body(ValidationPipe) saveTokenDto: SaveTokenDto,
  ) {
    // Get user email from Clerk
    const clerkUser = await clerkClient.users.getUser(user.clerkId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';

    return this.monobankService.saveToken(
      user.clerkId,
      email,
      saveTokenDto,
    );
  }

  @Post('sync')
  async syncTransactions(@CurrentUser() user: CurrentUserData) {
    return this.monobankService.syncTransactions(user.clerkId);
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.monobankService.getTransactions(
      user.clerkId,
      pageNum,
      limitNum,
    );
  }
}
