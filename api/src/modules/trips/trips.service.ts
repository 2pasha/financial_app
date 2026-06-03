import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { CreateTripItemDto } from './dto/create-trip-item.dto';
import { UpdateTripItemDto } from './dto/update-trip-item.dto';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { toUAHMinorUnits } from '../../utils/currency';

const TX_SUMMARY_SELECT = { select: { amount: true, currency: true, operationAmount: true, operationCurrency: true } } as const;

const TX_DETAIL_SELECT = {
  select: {
    id: true,
    monobankId: true,
    time: true,
    description: true,
    amount: true,
    balance: true,
    currency: true,
    mcc: true,
    originalMcc: true,
    hold: true,
    commissionRate: true,
    cashbackAmount: true,
    operationAmount: true,
    operationCurrency: true,
    categoryId: true,
    category: { select: { id: true, name: true, icon: true, color: true } },
    account: { select: { accountId: true, type: true } },
  },
  orderBy: { time: 'desc' as const },
};

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
  ) {}

  async findAll(clerkId: string) {
    const user = await this.findUser(clerkId);
    const rateToUAH = await this.exchangeRates.buildRateToUAH();

    const trips = await this.prisma.trip.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        plannedItems: { orderBy: { createdAt: 'asc' } },
        transactions: TX_SUMMARY_SELECT,
      },
    });

    return trips.map((trip) => this.formatTrip(trip, rateToUAH));
  }

  async findOne(clerkId: string, id: string) {
    const user = await this.findUser(clerkId);
    const rateToUAH = await this.exchangeRates.buildRateToUAH();

    const trip = await this.prisma.trip.findFirst({
      where: { id, userId: user.id },
      include: {
        plannedItems: { orderBy: { createdAt: 'asc' } },
        transactions: TX_DETAIL_SELECT,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const amounts = this.calcAmounts(trip.transactions, rateToUAH);

    return {
      ...this.formatTripBase(trip),
      ...amounts,
      transactions: trip.transactions.map((tx) => this.formatTransaction(tx)),
    };
  }

  async getTransactions(clerkId: string, tripId: string, from?: string, to?: string) {
    const user = await this.findUser(clerkId);

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    await this.assertOwnership(tripId, user.id);

    const transactions = await this.prisma.transaction.findMany({
      where: { tripId, userId: user.id, time: { gte: fromDate, lte: toDate } },
      orderBy: { time: 'desc' },
      select: { id: true, time: true, description: true, amount: true, currency: true, operationAmount: true, operationCurrency: true, mcc: true },
    });

    return transactions.map((tx) => ({
      id: tx.id,
      time: tx.time.toISOString(),
      description: tx.description,
      amount: Number(tx.amount) / 100,
      currency: tx.currency,
      operationAmount: tx.operationAmount !== null ? Number(tx.operationAmount) / 100 : null,
      operationCurrency: tx.operationCurrency,
      mcc: tx.mcc,
    }));
  }

  async create(clerkId: string, dto: CreateTripDto) {
    const user = await this.findUser(clerkId);
    const rateToUAH = await this.exchangeRates.buildRateToUAH();

    const trip = await this.prisma.trip.create({
      data: {
        userId: user.id,
        name: dto.name,
        icon: dto.icon ?? '✈️',
        color: dto.color ?? '#6366f1',
        goalAmount: dto.goalAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
      include: {
        plannedItems: true,
        transactions: TX_SUMMARY_SELECT,
      },
    });

    this.logger.log(`Trip created: ${trip.id}`);

    return this.formatTrip(trip, rateToUAH);
  }

  async update(clerkId: string, id: string, dto: UpdateTripDto) {
    const user = await this.findUser(clerkId);
    await this.assertOwnership(id, user.id);
    const rateToUAH = await this.exchangeRates.buildRateToUAH();

    const { targetDate, ...rest } = dto;
    const trip = await this.prisma.trip.update({
      where: { id },
      data: {
        ...rest,
        ...(Object.prototype.hasOwnProperty.call(dto, 'targetDate')
          ? { targetDate: targetDate ? new Date(targetDate) : null }
          : {}),
      },
      include: {
        plannedItems: { orderBy: { createdAt: 'asc' } },
        transactions: TX_SUMMARY_SELECT,
      },
    });

    return this.formatTrip(trip, rateToUAH);
  }

  async remove(clerkId: string, id: string) {
    const user = await this.findUser(clerkId);
    await this.assertOwnership(id, user.id);

    await this.prisma.trip.delete({ where: { id } });

    this.logger.log(`Trip deleted: ${id}`);

    return { success: true };
  }

  async addItem(clerkId: string, tripId: string, dto: CreateTripItemDto) {
    const user = await this.findUser(clerkId);
    await this.assertOwnership(tripId, user.id);

    return this.prisma.tripPlannedItem.create({
      data: { tripId, text: dto.text },
    });
  }

  async updateItem(clerkId: string, tripId: string, itemId: string, dto: UpdateTripItemDto) {
    const user = await this.findUser(clerkId);
    await this.assertOwnership(tripId, user.id);

    const item = await this.prisma.tripPlannedItem.findFirst({ where: { id: itemId, tripId } });
    if (!item) throw new NotFoundException('Planned item not found');

    return this.prisma.tripPlannedItem.update({ where: { id: itemId }, data: dto });
  }

  async removeItem(clerkId: string, tripId: string, itemId: string) {
    const user = await this.findUser(clerkId);
    await this.assertOwnership(tripId, user.id);

    const item = await this.prisma.tripPlannedItem.findFirst({ where: { id: itemId, tripId } });
    if (!item) throw new NotFoundException('Planned item not found');

    await this.prisma.tripPlannedItem.delete({ where: { id: itemId } });

    return { success: true };
  }

  private calcAmounts(
    transactions: { amount: bigint; currency: number; operationAmount: bigint | null; operationCurrency: number | null }[],
    rateToUAH: (code: number) => number = () => 1,
  ) {
    let collectedMinor = 0;
    let spentMinor = 0;
    for (const t of transactions) {
      const uah = toUAHMinorUnits(t, rateToUAH);
      if (uah > 0) collectedMinor += uah;
      else spentMinor += Math.abs(uah);
    }
    return {
      collectedAmount: collectedMinor / 100,
      spentAmount: spentMinor / 100,
    };
  }

  private formatTripBase(trip: {
    id: string;
    name: string;
    icon: string;
    color: string;
    goalAmount: number;
    targetDate: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    plannedItems: { id: string; text: string; completed: boolean; createdAt: Date }[];
  }) {
    return {
      id: trip.id,
      name: trip.name,
      icon: trip.icon,
      color: trip.color,
      goalAmount: trip.goalAmount,
      targetDate: trip.targetDate?.toISOString() ?? null,
      isActive: trip.isActive,
      plannedItems: trip.plannedItems,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    };
  }

  private formatTrip(
    trip: {
      id: string;
      name: string;
      icon: string;
      color: string;
      goalAmount: number;
      targetDate: Date | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      plannedItems: { id: string; text: string; completed: boolean; createdAt: Date }[];
      transactions: { amount: bigint; currency: number; operationAmount: bigint | null; operationCurrency: number | null }[];
    },
    rateToUAH: (code: number) => number = () => 1,
  ) {
    return {
      ...this.formatTripBase(trip),
      ...this.calcAmounts(trip.transactions, rateToUAH),
    };
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
    operationAmount: bigint | null;
    operationCurrency: number | null;
    categoryId: string | null;
    category: { id: string; name: string; icon: string; color: string } | null;
    account: { accountId: string; type: string };
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
      operationAmount: tx.operationAmount !== null ? Number(tx.operationAmount) : null,
      operationCurrency: tx.operationCurrency,
      categoryId: tx.categoryId,
      category: tx.category ?? null,
      account: { id: tx.account.accountId, type: tx.account.type },
    };
  }

  private async findUser(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async assertOwnership(id: string, userId: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id, userId } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }
}
