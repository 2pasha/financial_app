import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DEFAULT_CATEGORIES } from './default-categories';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(
    clerkId: string,
    from?: string,
    to?: string,
    calendarYear?: number,
    calendarMonth?: number,
  ) {
    const user = await this.findUser(clerkId);

    await this.ensureDefaultCategories(user.id);

    const { fromDate, toDate } = this.resolveDateRange(from, to);

    const periodYear = calendarYear ?? (from ? new Date(from).getFullYear() : null);
    const periodMonth = calendarMonth ?? (from ? new Date(from).getMonth() + 1 : null);

    const categories = await this.prisma.category.findMany({
      where: {
        userId: user.id,
        OR: (periodYear
          ? [{ year: null }, { year: periodYear, month: periodMonth }]
          : [{ year: null }]) as any,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        transactions: {
          select: { amount: true },
          where: {
            time: { gte: fromDate, lte: toDate },
          },
        },
      },
    });

    return categories.map((cat) => this.formatCategory(cat));
  }

  private resolveDateRange(
    from?: string,
    to?: string,
  ): { fromDate: Date; toDate: Date } {
    if (from && to) {
      return { fromDate: new Date(from), toDate: new Date(to) };
    }

    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return { fromDate, toDate };
  }

  async create(clerkId: string, dto: CreateCategoryDto) {
    const user = await this.findUser(clerkId);

    const hasYear = dto.year !== undefined;
    const hasMonth = dto.month !== undefined;

    if (hasYear !== hasMonth) {
      throw new BadRequestException('year and month must be provided together');
    }

    const category = await this.prisma.category.create({
      data: {
        userId: user.id,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        budget: dto.budget,
        mccCodes: dto.mccCodes ?? [],
        excludeFromDashboard: dto.excludeFromDashboard ?? false,
        ...(dto.year !== undefined && { year: dto.year, month: dto.month }),
      } as any,
      include: {
        transactions: {
          select: { amount: true },
        },
      },
    });

    this.logger.log(`Category created: ${category.id} for user ${user.id}`);

    return this.formatCategory(category);
  }

  async update(clerkId: string, id: string, dto: UpdateCategoryDto) {
    const user = await this.findUser(clerkId);
    await this.findOwnedCategory(id, user.id);

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        budget: dto.budget,
        ...(dto.mccCodes !== undefined && { mccCodes: dto.mccCodes }),
        ...(dto.excludeFromDashboard !== undefined && { excludeFromDashboard: dto.excludeFromDashboard }),
      } as any,
      include: {
        transactions: {
          select: { amount: true },
        },
      },
    });

    return this.formatCategory(category);
  }

  async ensureDefaultCategories(userId: string): Promise<void> {
    const existing = await this.prisma.category.findMany({
      where: { userId },
      select: { name: true },
    });

    const existingNames = new Set(existing.map((c) => c.name));
    const missing = DEFAULT_CATEGORIES.filter((cat) => !existingNames.has(cat.name));

    if (missing.length === 0) {
      return;
    }

    await this.prisma.category.createMany({
      data: missing.map((cat) => ({
        userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        budget: cat.budget,
        mccCodes: cat.mccCodes,
      })) as any,
    });

    this.logger.log(`Seeded ${missing.length} missing default categories for user ${userId}`);
  }

  async getCategoriesWithMccCodes(
    userId: string,
  ): Promise<Array<{ id: string; name: string; mccCodes: number[] }>> {
    const results = await this.prisma.category.findMany({
      where: { userId, year: null },
    });

    return results.map((cat) => ({
      id: cat.id,
      name: cat.name,
      mccCodes: (cat as unknown as { mccCodes: number[] }).mccCodes ?? [],
    }));
  }

  async getTransactionsForCategory(
    clerkId: string,
    categoryId: string,
    from?: string,
    to?: string,
  ) {
    const user = await this.findUser(clerkId);
    await this.findOwnedCategory(categoryId, user.id);

    const { fromDate, toDate } = this.resolveDateRange(from, to);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        categoryId,
        userId: user.id,
        time: { gte: fromDate, lte: toDate },
      },
      orderBy: { time: 'desc' },
      select: {
        id: true,
        time: true,
        description: true,
        amount: true,
        mcc: true,
      },
    });

    return transactions.map((tx) => ({
      id: tx.id,
      time: tx.time,
      description: tx.description,
      amount: Number(tx.amount) / 100,
      mcc: tx.mcc,
    }));
  }

  async delete(clerkId: string, id: string) {
    const user = await this.findUser(clerkId);
    await this.findOwnedCategory(id, user.id);

    await this.prisma.transaction.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await this.prisma.budgetPlanItem.deleteMany({ where: { categoryId: id } });

    await this.prisma.category.delete({ where: { id } });

    this.logger.log(`Category deleted: ${id}`);

    return { success: true };
  }

  private formatCategory(cat: {
    id: string;
    name: string;
    icon: string;
    color: string;
    budget: number;
    year?: number | null;
    month?: number | null;
    excludeFromDashboard?: boolean | null;
    transactions: { amount: bigint }[];
  }) {
    const netMinorUnits = cat.transactions.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );

    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      budget: cat.budget,
      year: cat.year ?? null,
      month: cat.month ?? null,
      excludeFromDashboard: cat.excludeFromDashboard ?? false,
      spent: Math.max(0, -netMinorUnits) / 100,
      net: netMinorUnits / 100,
    };
  }

  private async findUser(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async findOwnedCategory(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
}
