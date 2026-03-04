import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  Param,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MonobankService } from './monobank.service';
import { SyncJobStore } from './sync-job.store';
import { SaveTokenDto } from './dto/save-token.dto';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { clerkClient } from '@clerk/clerk-sdk-node';
import type { MonobankWebhookPayload } from './interfaces/monobank-webhook.interface';

@Controller('monobank')
export class MonobankController {
  private readonly logger = new Logger(MonobankController.name);

  constructor(
    private readonly monobankService: MonobankService,
    private readonly syncJobStore: SyncJobStore,
  ) {}

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
  @HttpCode(HttpStatus.ACCEPTED)
  async syncTransactions(@CurrentUser() user: CurrentUserData) {
    const jobId = crypto.randomUUID();

    this.syncJobStore.create(jobId);
    void this.monobankService.syncTransactionsBackground(user.clerkId, jobId);

    return { jobId };
  }

  @Get('sync/status/:jobId')
  @UseGuards(ClerkAuthGuard)
  getSyncStatus(@Param('jobId') jobId: string) {
    const job = this.syncJobStore.get(jobId);

    if (!job) {
      throw new NotFoundException(`Sync job ${jobId} not found`);
    }

    return job;
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
