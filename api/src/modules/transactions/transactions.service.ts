import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const MANUAL_ACCOUNT_ID = 'manual';
const DEFAULT_CURRENCY = 980; // UAH

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(clerkId: string, dto: CreateTransactionDto) {
    const user = await this.findUser(clerkId);
    const account = await this.ensureManualAccount(user.id, dto.currency ?? DEFAULT_CURRENCY);

    const monobankId = `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const tx = await this.prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        monobankId,
        time: new Date(dto.time),
        description: dto.description,
        amount: BigInt(dto.amount),
        balance: BigInt(0),
        currency: dto.currency ?? DEFAULT_CURRENCY,
        hold: false,
        categoryId: dto.categoryId ?? null,
      },
      include: { account: true, category: true },
    });

    this.logger.log(`Manual transaction created: ${tx.id}`);

    return this.formatTransaction(tx);
  }

  async update(clerkId: string, id: string, dto: UpdateTransactionDto) {
    const user = await this.findUser(clerkId);
    await this.findOwnedTransaction(id, user.id);

    const updateData: Record<string, unknown> = {};

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.amount !== undefined) {
      updateData.amount = BigInt(dto.amount);
    }

    if (dto.time !== undefined) {
      updateData.time = new Date(dto.time);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'categoryId')) {
      updateData.categoryId = dto.categoryId ?? null;
    }

    const tx = await this.prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { account: true, category: true },
    });

    return this.formatTransaction(tx);
  }

  async delete(clerkId: string, id: string) {
    const user = await this.findUser(clerkId);
    await this.findOwnedTransaction(id, user.id);

    await this.prisma.transaction.delete({ where: { id } });

    this.logger.log(`Transaction deleted: ${id}`);

    return { success: true };
  }

  private async ensureManualAccount(userId: string, currency: number) {
    return this.prisma.account.upsert({
      where: {
        userId_accountId: { userId, accountId: MANUAL_ACCOUNT_ID },
      },
      update: {},
      create: {
        userId,
        accountId: MANUAL_ACCOUNT_ID,
        balance: BigInt(0),
        currency,
        type: 'manual',
      },
    });
  }

  private formatTransaction(tx: {
    id: string;
    monobankId: string;
    time: Date;
    description: string;
    amount: bigint;
    balance: bigint;
    currency: number;
    mcc: number | null;
    originalMcc: number | null;
    hold: boolean;
    commissionRate: bigint | null;
    cashbackAmount: bigint | null;
    categoryId: string | null;
    account: { accountId: string; type: string };
    category: { id: string; name: string; icon: string; color: string } | null;
  }) {
    return {
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
      commissionRate: Number(tx.commissionRate ?? 0),
      cashbackAmount: Number(tx.cashbackAmount ?? 0),
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
    };
  }

  private async findUser(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async findOwnedTransaction(id: string, userId: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    return tx;
  }
}
