import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MonobankService } from './monobank.service';
import { SaveTokenDto } from './dto/save-token.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { clerkClient } from '@clerk/clerk-sdk-node';
import type { MonobankWebhookPayload } from './interfaces/monobank-webhook.interface';

@Controller('monobank')
export class MonobankController {
  private readonly logger = new Logger(MonobankController.name);

  constructor(private readonly monobankService: MonobankService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: MonobankWebhookPayload) {
    this.logger.log(`Webhook received: ${JSON.stringify(payload).slice(0, 200)}`);

    await this.monobankService.handleWebhook(payload);

    return { status: 'ok' };
  }

  @Post('webhook/setup')
  @UseGuards(ClerkAuthGuard)
  async setupWebhook(@CurrentUser() user: CurrentUserData) {
    return this.monobankService.setupWebhook(user.clerkId);
  }

  @Post('token')
  @UseGuards(ClerkAuthGuard)
  async saveToken(
    @CurrentUser() user: CurrentUserData,
    @Body(ValidationPipe) saveTokenDto: SaveTokenDto,
  ) {
    const clerkUser = await clerkClient.users.getUser(user.clerkId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';

    return this.monobankService.saveToken(
      user.clerkId,
      email,
      saveTokenDto,
    );
  }

  @Get('token/status')
  @UseGuards(ClerkAuthGuard)
  async checkTokenStatus(@CurrentUser() user: CurrentUserData) {
    return this.monobankService.checkTokenStatus(user.clerkId);
  }

  @Post('sync')
  @UseGuards(ClerkAuthGuard)
  async syncTransactions(@CurrentUser() user: CurrentUserData) {
    return this.monobankService.syncTransactions(user.clerkId);
  }

  @Post('sync/incremental')
  @UseGuards(ClerkAuthGuard)
  async syncIncrementalTransactions(@CurrentUser() user: CurrentUserData) {
    return this.monobankService.syncIncrementalTransactions(user.clerkId);
  }

  @Get('transactions')
  @UseGuards(ClerkAuthGuard)
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
