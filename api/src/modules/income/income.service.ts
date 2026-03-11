import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';

@Injectable()
export class IncomeService {
  private readonly logger = new Logger(IncomeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(clerkId: string) {
    const user = await this.findUser(clerkId);

    return this.prisma.income.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(clerkId: string, dto: CreateIncomeDto) {
    const user = await this.findUser(clerkId);

    const income = await this.prisma.income.create({
      data: {
        userId: user.id,
        source: dto.source,
        amount: dto.amount,
      },
    });

    this.logger.log(`Income created: ${income.id} for user ${user.id}`);

    return income;
  }

  async update(clerkId: string, id: string, dto: UpdateIncomeDto) {
    const user = await this.findUser(clerkId);
    await this.findOwnedIncome(id, user.id);

    const income = await this.prisma.income.update({
      where: { id },
      data: {
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
      },
    });

    return income;
  }

  async delete(clerkId: string, id: string) {
    const user = await this.findUser(clerkId);
    await this.findOwnedIncome(id, user.id);

    await this.prisma.income.delete({ where: { id } });

    this.logger.log(`Income deleted: ${id}`);

    return { success: true };
  }

  private async findUser(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async findOwnedIncome(id: string, userId: string) {
    const income = await this.prisma.income.findFirst({
      where: { id, userId },
    });

    if (!income) {
      throw new NotFoundException('Income not found');
    }

    return income;
  }
}
