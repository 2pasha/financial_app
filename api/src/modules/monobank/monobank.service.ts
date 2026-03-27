import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MonobankApiService } from './monobank-api.service';
import { CryptoService } from '../../common/services/crypto.service';
import { CategoriesService } from '../categories/categories.service';
import { SaveTokenDto } from './dto/save-token.dto';
import { SyncResponseDto } from './dto/sync-response.dto';
import { SyncJobStore } from './sync-job.store';
import type { MonobankWebhookPayload, MonobankWebhookStatementItem } from './interfaces/monobank-webhook.interface';

type CategoryMccEntry = { id: string; name: string; mccCodes: number[] };

@Injectable()
export class MonobankService {
  private readonly logger = new Logger(MonobankService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly monobankApi: MonobankApiService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
    private readonly syncJobStore: SyncJobStore,
    private readonly categoriesService: CategoriesService,
  ) {}

  private resolveCategoryId(
    mcc: number | null,
    categories: CategoryMccEntry[],
    otherCategoryId: string,
  ): string {
    if (!mcc) {
      return otherCategoryId;
    }

    const matched = categories.find(
      (cat) => cat.mccCodes.length > 0 && cat.mccCodes.includes(mcc),
    );

    return matched?.id ?? otherCategoryId;
  }

  private async backfillCategories(
    userId: string,
    categories: CategoryMccEntry[],
    otherCategoryId: string,
  ): Promise<void> {
    for (const category of categories) {
      if (category.mccCodes.length === 0) {
        continue;
      }

      await this.prisma.transaction.updateMany({
        where: { userId, categoryId: null, mcc: { in: category.mccCodes } },
        data: { categoryId: category.id },
      });
    }

    await this.prisma.transaction.updateMany({
      where: { userId, categoryId: null },
      data: { categoryId: otherCategoryId },
    });
  }

  /**
   * Save or update user's Monobank token
   */
  async saveToken(
    clerkId: string,
    email: string,
    saveTokenDto: SaveTokenDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // First, verify the token by fetching client info
      this.logger.log(`Verifying Monobank token for user ${clerkId}`);
      await this.monobankApi.getClientInfo(saveTokenDto.token);

      // Find or create user
      let user = await this.prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            clerkId,
            email,
          },
        });
        this.logger.log(`Created new user ${user.id}`);
      }

      const encryptedToken = this.crypto.encrypt(saveTokenDto.token);

      await this.prisma.monobankToken.upsert({
        where: { userId: user.id },
        update: {
          token: encryptedToken,
        },
        create: {
          userId: user.id,
          token: encryptedToken,
        },
      });

      this.logger.log(`Token saved successfully for user ${user.id}`);

      return {
        success: true,
        message: 'Monobank token saved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to save token', error);
      throw error;
    }
  }

  /**
   * Check if user has token and transactions
   */
  async checkTokenStatus(clerkId: string): Promise<{
    hasToken: boolean;
    hasTransactions: boolean;
    transactionCount: number;
    lastTransactionDate: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      include: {
        monobankToken: true,
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!user) {
      return {
        hasToken: false,
        hasTransactions: false,
        transactionCount: 0,
        lastTransactionDate: null,
      };
    }

    let lastTransactionDate: string | null = null;
    if (user._count.transactions > 0) {
      const lastTx = await this.prisma.transaction.findFirst({
        where: { userId: user.id },
        orderBy: { time: 'desc' },
        select: { time: true },
      });
      lastTransactionDate = lastTx ? lastTx.time.toISOString() : null;
    }

    return {
      hasToken: !!user.monobankToken,
      hasTransactions: user._count.transactions > 0,
      transactionCount: user._count.transactions,
      lastTransactionDate,
    };
  }

  /**
   * Sync transactions for the last 3 months
   */
  async syncTransactions(clerkId: string): Promise<SyncResponseDto> {
    try {
      // Find user and token
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
        include: { monobankToken: true },
      });

      if (!user || !user.monobankToken) {
        throw new NotFoundException('Monobank token not found. Please save your token first.');
      }

      const rawToken = user.monobankToken.token;
      const token = this.crypto.isEncrypted(rawToken)
        ? this.crypto.decrypt(rawToken)
        : rawToken;

      // Get client info and accounts
      this.logger.log(`Fetching accounts for user ${user.id}`);
      const clientInfo = await this.monobankApi.getClientInfo(token);

      // Save accounts
      let accountsCount = 0;
      for (const monobankAccount of clientInfo.accounts) {
        await this.prisma.account.upsert({
          where: {
            userId_accountId: {
              userId: user.id,
              accountId: monobankAccount.id,
            },
          },
          update: {
            balance: BigInt(monobankAccount.balance),
            currency: monobankAccount.currencyCode,
            type: monobankAccount.type,
          },
          create: {
            userId: user.id,
            accountId: monobankAccount.id,
            balance: BigInt(monobankAccount.balance),
            currency: monobankAccount.currencyCode,
            type: monobankAccount.type,
          },
        });
        accountsCount++;
      }

      this.logger.log(`Saved ${accountsCount} accounts for user ${user.id}`);

      // Calculate date ranges (last 3 months, split into 31-day chunks)
      const now = Math.floor(Date.now() / 1000);
      const threeMonthsAgo = now - (90 * 24 * 60 * 60); // 90 days in seconds
      const dateRanges = this.splitIntoChunks(threeMonthsAgo, now, 31);

      let totalTransactions = 0;

      // Fetch transactions for each account
      for (const monobankAccount of clientInfo.accounts) {
        this.logger.log(`Syncing transactions for account ${monobankAccount.id}`);

        // Get the account from database
        const account = await this.prisma.account.findUnique({
          where: {
            userId_accountId: {
              userId: user.id,
              accountId: monobankAccount.id,
            },
          },
        });

        if (!account) {
          continue;
        }

        // Fetch transactions for each date range with rate limiting
        for (let i = 0; i < dateRanges.length; i++) {
          const { from, to } = dateRanges[i];

          this.logger.log(
            `Fetching chunk ${i + 1}/${dateRanges.length} for account ${monobankAccount.id}`,
          );

          try {
            const transactions = await this.monobankApi.getStatement(
              token,
              monobankAccount.id,
              from,
              to,
            );

            // Save transactions
            for (const tx of transactions) {
              try {
                await this.prisma.transaction.upsert({
                  where: { monobankId: tx.id },
                  update: {
                    time: new Date(tx.time * 1000),
                    description: tx.description,
                    amount: BigInt(tx.amount),
                    balance: BigInt(tx.balance),
                    currency: tx.currencyCode,
                    mcc: tx.mcc,
                    originalMcc: tx.originalMcc,
                    hold: tx.hold,
                    commissionRate: BigInt(tx.commissionRate),
                    cashbackAmount: BigInt(tx.cashbackAmount),
                  },
                  create: {
                    userId: user.id,
                    accountId: account.id,
                    monobankId: tx.id,
                    time: new Date(tx.time * 1000),
                    description: tx.description,
                    amount: BigInt(tx.amount),
                    balance: BigInt(tx.balance),
                    currency: tx.currencyCode,
                    mcc: tx.mcc,
                    originalMcc: tx.originalMcc,
                    hold: tx.hold,
                    commissionRate: BigInt(tx.commissionRate),
                    cashbackAmount: BigInt(tx.cashbackAmount),
                  },
                });
                totalTransactions++;
              } catch (error) {
                this.logger.error(`Failed to save transaction ${tx.id}`, error);
              }
            }

            this.logger.log(`Saved ${transactions.length} transactions from this chunk`);

            // Wait 60 seconds before next API call (rate limiting)
            if (i < dateRanges.length - 1) {
              this.logger.log('Waiting 60 seconds for rate limiting...');
              await this.monobankApi.wait(60000);
            }
          } catch (error) {
            this.logger.error(`Failed to fetch transactions for chunk ${i + 1}`, error);
            // Continue with next chunk
          }
        }

        // Wait before processing next account
        this.logger.log('Waiting 60 seconds before next account...');
        await this.monobankApi.wait(60000);
      }

      return {
        success: true,
        message: 'Transactions synced successfully',
        accountsCount,
        transactionsCount: totalTransactions,
      };
    } catch (error) {
      this.logger.error('Failed to sync transactions', error);
      throw error;
    }
  }

  /**
   * Fire-and-forget sync that reports progress to SyncJobStore
   */
  async syncTransactionsBackground(clerkId: string, jobId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
        include: { monobankToken: true },
      });

      if (!user || !user.monobankToken) {
        this.syncJobStore.update(jobId, {
          status: 'failed',
          error: 'Monobank token not found. Please save your token first.',
          message: 'Failed: token not found.',
        });

        return;
      }

      const rawToken = user.monobankToken.token;
      const token = this.crypto.isEncrypted(rawToken)
        ? this.crypto.decrypt(rawToken)
        : rawToken;

      this.syncJobStore.update(jobId, { status: 'running', message: 'Fetching account info...' });

      const clientInfo = await this.monobankApi.getClientInfo(token);
      const totalAccounts = clientInfo.accounts.length;

      this.syncJobStore.update(jobId, { totalAccounts, message: 'Saving accounts...' });

      let accountsCount = 0;
      for (const monobankAccount of clientInfo.accounts) {
        await this.prisma.account.upsert({
          where: { userId_accountId: { userId: user.id, accountId: monobankAccount.id } },
          update: {
            balance: BigInt(monobankAccount.balance),
            currency: monobankAccount.currencyCode,
            type: monobankAccount.type,
          },
          create: {
            userId: user.id,
            accountId: monobankAccount.id,
            balance: BigInt(monobankAccount.balance),
            currency: monobankAccount.currencyCode,
            type: monobankAccount.type,
          },
        });
        accountsCount++;
      }

      await this.categoriesService.ensureDefaultCategories(user.id);
      const categories = (await this.categoriesService.getCategoriesWithMccCodes(user.id)) as CategoryMccEntry[];
      const otherCategory = categories.find((c) => c.name === 'Інше');
      const otherCategoryId = otherCategory?.id ?? categories[0]?.id ?? '';

      const now = Math.floor(Date.now() / 1000);
      const threeMonthsAgo = now - 90 * 24 * 60 * 60;
      const dateRanges = this.splitIntoChunks(threeMonthsAgo, now, 31);

      let totalTransactions = 0;

      for (let accountIndex = 0; accountIndex < clientInfo.accounts.length; accountIndex++) {
        const monobankAccount = clientInfo.accounts[accountIndex];
        const currentAccount = accountIndex + 1;

        this.syncJobStore.update(jobId, {
          currentAccount,
          message: `Syncing account ${currentAccount} of ${totalAccounts}...`,
        });

        const account = await this.prisma.account.findUnique({
          where: { userId_accountId: { userId: user.id, accountId: monobankAccount.id } },
        });

        if (!account) {
          continue;
        }

        for (let i = 0; i < dateRanges.length; i++) {
          const { from, to } = dateRanges[i];

          try {
            const transactions = await this.monobankApi.getStatement(
              token,
              monobankAccount.id,
              from,
              to,
            );

            for (const tx of transactions) {
              try {
                const categoryId = this.resolveCategoryId(tx.mcc ?? null, categories, otherCategoryId);

                await this.prisma.transaction.upsert({
                  where: { monobankId: tx.id },
                  update: {
                    time: new Date(tx.time * 1000),
                    description: tx.description,
                    amount: BigInt(tx.amount),
                    balance: BigInt(tx.balance),
                    currency: tx.currencyCode,
                    mcc: tx.mcc,
                    originalMcc: tx.originalMcc,
                    hold: tx.hold,
                    commissionRate: BigInt(tx.commissionRate),
                    cashbackAmount: BigInt(tx.cashbackAmount),
                  },
                  create: {
                    userId: user.id,
                    accountId: account.id,
                    monobankId: tx.id,
                    time: new Date(tx.time * 1000),
                    description: tx.description,
                    amount: BigInt(tx.amount),
                    balance: BigInt(tx.balance),
                    currency: tx.currencyCode,
                    mcc: tx.mcc,
                    originalMcc: tx.originalMcc,
                    hold: tx.hold,
                    commissionRate: BigInt(tx.commissionRate),
                    cashbackAmount: BigInt(tx.cashbackAmount),
                    categoryId,
                  },
                });
                totalTransactions++;
              } catch (error) {
                this.logger.error(`Failed to save transaction ${tx.id}`, error);
              }
            }

            this.syncJobStore.update(jobId, {
              transactionsCount: totalTransactions,
              message: `Account ${currentAccount} of ${totalAccounts}: ${totalTransactions} transactions so far...`,
            });

            if (i < dateRanges.length - 1) {
              this.syncJobStore.update(jobId, {
                message: `Account ${currentAccount} of ${totalAccounts}: waiting 60s (rate limit)...`,
              });
              await this.monobankApi.wait(60000);
            }
          } catch (error) {
            this.logger.error(`Failed to fetch transactions for chunk ${i + 1}`, error);
          }
        }

        if (accountIndex < clientInfo.accounts.length - 1) {
          this.syncJobStore.update(jobId, {
            message: `Account ${currentAccount} done. Waiting 60s before next account...`,
          });
          await this.monobankApi.wait(60000);
        }
      }

      this.syncJobStore.update(jobId, { message: 'Categorizing existing transactions...' });
      await this.backfillCategories(user.id, categories, otherCategoryId);

      this.syncJobStore.update(jobId, {
        status: 'completed',
        transactionsCount: totalTransactions,
        message: `Sync complete! ${totalTransactions} transactions synced across ${accountsCount} account(s).`,
      });
    } catch (error) {
      this.logger.error('Background sync failed', error);
      this.syncJobStore.update(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Sync failed. Please try again.',
      });
    }
  }

  /**
   * Sync transactions incrementally from last transaction date
   */
  async syncIncrementalTransactions(clerkId: string): Promise<SyncResponseDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
        include: { monobankToken: true },
      });

      if (!user || !user.monobankToken) {
        throw new NotFoundException('Monobank token not found');
      }

      // Get last transaction date
      const lastTx = await this.prisma.transaction.findFirst({
        where: { userId: user.id },
        orderBy: { time: 'desc' },
        select: { time: true },
      });

      if (!lastTx) {
        // No transactions, do full sync
        return this.syncTransactions(clerkId);
      }

      const rawToken = user.monobankToken.token;
      const token = this.crypto.isEncrypted(rawToken)
        ? this.crypto.decrypt(rawToken)
        : rawToken;
      const clientInfo = await this.monobankApi.getClientInfo(token);

      // Sync from last transaction date to now
      let fromTimestamp = Math.floor(lastTx.time.getTime() / 1000);
      const toTimestamp = Math.floor(Date.now() / 1000);
      
      // Check if period exceeds 31 days
      const daysDiff = (toTimestamp - fromTimestamp) / (60 * 60 * 24);
      let fallbackTo31Days = false;
      
      if (daysDiff > 31) {
        // Fall back to last 31 days
        fromTimestamp = toTimestamp - (31 * 24 * 60 * 60);
        fallbackTo31Days = true;
        this.logger.log('Period exceeds 31 days, falling back to last 31 days');
      }

      await this.categoriesService.ensureDefaultCategories(user.id);
      const categories = (await this.categoriesService.getCategoriesWithMccCodes(user.id)) as CategoryMccEntry[];
      const otherCategory = categories.find((c) => c.name === 'Інше');
      const otherCategoryId = otherCategory?.id ?? categories[0]?.id ?? '';

      let totalTransactions = 0;
      let accountsCount = 0;

      for (const monobankAccount of clientInfo.accounts) {
        await this.prisma.account.upsert({
          where: {
            userId_accountId: {
              userId: user.id,
              accountId: monobankAccount.id,
            },
          },
          update: {
            balance: BigInt(monobankAccount.balance),
            currency: monobankAccount.currencyCode,
            type: monobankAccount.type,
          },
          create: {
            userId: user.id,
            accountId: monobankAccount.id,
            balance: BigInt(monobankAccount.balance),
            currency: monobankAccount.currencyCode,
            type: monobankAccount.type,
          },
        });
        accountsCount++;

        const account = await this.prisma.account.findUnique({
          where: {
            userId_accountId: {
              userId: user.id,
              accountId: monobankAccount.id,
            },
          },
        });

        if (!account) {
          continue;
        }

        try {
          const transactions = await this.monobankApi.getStatement(
            token,
            monobankAccount.id,
            fromTimestamp,
            toTimestamp,
          );

          for (const tx of transactions) {
            try {
              const categoryId = this.resolveCategoryId(tx.mcc ?? null, categories, otherCategoryId);

              await this.prisma.transaction.upsert({
                where: { monobankId: tx.id },
                update: {
                  time: new Date(tx.time * 1000),
                  description: tx.description,
                  amount: BigInt(tx.amount),
                  balance: BigInt(tx.balance),
                  currency: tx.currencyCode,
                  mcc: tx.mcc,
                  originalMcc: tx.originalMcc,
                  hold: tx.hold,
                  commissionRate: BigInt(tx.commissionRate),
                  cashbackAmount: BigInt(tx.cashbackAmount),
                },
                create: {
                  userId: user.id,
                  accountId: account.id,
                  monobankId: tx.id,
                  time: new Date(tx.time * 1000),
                  description: tx.description,
                  amount: BigInt(tx.amount),
                  balance: BigInt(tx.balance),
                  currency: tx.currencyCode,
                  mcc: tx.mcc,
                  originalMcc: tx.originalMcc,
                  hold: tx.hold,
                  commissionRate: BigInt(tx.commissionRate),
                  cashbackAmount: BigInt(tx.cashbackAmount),
                  categoryId,
                },
              });
              totalTransactions++;
            } catch (error) {
              this.logger.error(`Failed to save transaction ${tx.id}`, error);
            }
          }

          this.logger.log(`Fetched ${transactions.length} new transactions`);

          if (
            clientInfo.accounts.indexOf(monobankAccount) <
            clientInfo.accounts.length - 1
          ) {
            await this.monobankApi.wait(60000);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch incremental transactions`, error);
        }
      }

      await this.backfillCategories(user.id, categories, otherCategoryId);

      return {
        success: true,
        message: 'Incremental sync completed',
        accountsCount,
        transactionsCount: totalTransactions,
        fallbackTo31Days,
      };
    } catch (error) {
      this.logger.error('Failed incremental sync', error);
      throw error;
    }
  }

  /**
   * Register the webhook URL with Monobank for the given user
   */
  async setupWebhook(clerkId: string): Promise<{ success: boolean; webhookUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      include: { monobankToken: true },
    });

    if (!user || !user.monobankToken) {
      throw new NotFoundException('Monobank token not found. Please save your token first.');
    }

    const rawToken = user.monobankToken.token;
    const token = this.crypto.isEncrypted(rawToken)
      ? this.crypto.decrypt(rawToken)
      : rawToken;

    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const webhookUrl = `${appUrl}/monobank/webhook`;

    await this.monobankApi.setWebhook(token, webhookUrl);

    this.logger.log(`Webhook registered for user ${user.id}: ${webhookUrl}`);

    return { success: true, webhookUrl };
  }

  /**
   * Handle incoming webhook from Monobank
   */
  async handleWebhook(payload: MonobankWebhookPayload): Promise<void> {
    if (payload.type !== 'StatementItem') {
      this.logger.warn(`Unknown webhook type: ${payload.type}`);

      return;
    }

    const { account: monobankAccountId, statementItem } = payload.data;

    this.logger.log(
      `Webhook received: tx ${statementItem.id} for account ${monobankAccountId}`,
    );

    const account = await this.prisma.account.findFirst({
      where: { accountId: monobankAccountId },
    });

    if (!account) {
      this.logger.warn(`No account found for Monobank account ${monobankAccountId}`);

      return;
    }

    const categories = await this.categoriesService.getCategoriesWithMccCodes(account.userId);
    const otherCategory = categories.find((c) => c.mccCodes.length === 0);
    const categoryId = this.resolveCategoryId(
      statementItem.mcc ?? null,
      categories,
      otherCategory?.id ?? '',
    );

    await this.deleteMatchingHoldTransaction(account.id, statementItem);

    try {
      await this.prisma.transaction.upsert({
        where: { monobankId: statementItem.id },
        update: {
          time: new Date(statementItem.time * 1000),
          description: statementItem.description,
          amount: BigInt(statementItem.amount),
          balance: BigInt(statementItem.balance),
          currency: statementItem.currencyCode,
          mcc: statementItem.mcc,
          originalMcc: statementItem.originalMcc,
          hold: statementItem.hold,
          commissionRate: BigInt(statementItem.commissionRate),
          cashbackAmount: BigInt(statementItem.cashbackAmount),
        },
        create: {
          userId: account.userId,
          accountId: account.id,
          monobankId: statementItem.id,
          time: new Date(statementItem.time * 1000),
          description: statementItem.description,
          amount: BigInt(statementItem.amount),
          balance: BigInt(statementItem.balance),
          currency: statementItem.currencyCode,
          mcc: statementItem.mcc,
          originalMcc: statementItem.originalMcc,
          hold: statementItem.hold,
          commissionRate: BigInt(statementItem.commissionRate),
          cashbackAmount: BigInt(statementItem.cashbackAmount),
          categoryId,
        },
      });

      this.logger.log(`Transaction ${statementItem.id} saved via webhook`);
    } catch (error) {
      this.logger.error(`Failed to save webhook transaction ${statementItem.id}`, error);
      throw error;
    }
  }

  private async deleteMatchingHoldTransaction(
    accountId: string,
    statementItem: MonobankWebhookStatementItem,
  ): Promise<void> {
    if (statementItem.hold) {
      return;
    }

    const txTime = new Date(statementItem.time * 1000);
    const windowMs = 5 * 60 * 1000;

    const deleted = await this.prisma.transaction.deleteMany({
      where: {
        accountId,
        hold: true,
        amount: BigInt(statementItem.amount),
        mcc: statementItem.mcc ?? null,
        monobankId: { not: statementItem.id },
        time: {
          gte: new Date(txTime.getTime() - windowMs),
          lte: new Date(txTime.getTime() + windowMs),
        },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(
        `Deleted ${deleted.count} hold transaction(s) superseded by settled tx ${statementItem.id}`,
      );
    }
  }

  /**
   * Get user transactions from database
   */
  async getTransactions(
    clerkId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { time: 'desc' },
        skip,
        take: limit,
        include: {
          account: true,
          category: true,
        },
      }),
      this.prisma.transaction.count({
        where: { userId: user.id },
      }),
    ]);

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        monobankId: tx.monobankId,
        time: tx.time.toISOString(),
        description: tx.description,
        amount: Number(tx.amount),
        balance: Number(tx.balance),
        currency: tx.currency,
        mcc: tx.mcc,
        originalMcc: tx.originalMcc,
        hold: tx.hold,
        commissionRate: Number(tx.commissionRate),
        cashbackAmount: Number(tx.cashbackAmount),
        categoryId: tx.categoryId,
        category: tx.category
          ? {
              id: tx.category.id,
              name: tx.category.name,
              icon: tx.category.icon,
              color: tx.category.color,
            }
          : null,
        account: {
          id: tx.account.accountId,
          type: tx.account.type,
        },
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Split date range into chunks of specified days
   */
  private splitIntoChunks(
    fromTimestamp: number,
    toTimestamp: number,
    chunkDays: number,
  ): Array<{ from: number; to: number }> {
    const chunks: Array<{ from: number; to: number }> = [];
    const chunkSeconds = chunkDays * 24 * 60 * 60;

    let currentFrom = fromTimestamp;
    while (currentFrom < toTimestamp) {
      const currentTo = Math.min(currentFrom + chunkSeconds, toTimestamp);
      chunks.push({ from: currentFrom, to: currentTo });
      currentFrom = currentTo;
    }

    return chunks;
  }
}
