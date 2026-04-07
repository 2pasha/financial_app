import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpsertBudgetPlanDto } from './dto/upsert-budget-plan.dto';

@Injectable()
export class BudgetPlansService {
  private readonly logger = new Logger(BudgetPlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findForMonth(clerkId: string, year: number, month: number) {
    const user = await this.findUser(clerkId);

    return this.prisma.budgetPlan.findUnique({
      where: { userId_year_month: { userId: user.id, year, month } },
      include: {
        items: {
          include: {
            category: {
              select: { id: true, name: true, icon: true, color: true, budget: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async upsert(clerkId: string, dto: UpsertBudgetPlanDto) {
    const user = await this.findUser(clerkId);

    const plan = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.budgetPlan.findUnique({
        where: {
          userId_year_month: { userId: user.id, year: dto.year, month: dto.month },
        },
      });

      if (existing) {
        await tx.budgetPlanItem.deleteMany({ where: { planId: existing.id } });

        await tx.budgetPlan.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() },
        });

        await tx.budgetPlanItem.createMany({
          data: dto.items.map((item) => ({
            planId: existing.id,
            categoryId: item.categoryId,
            budget: item.budget,
          })),
        });

        return tx.budgetPlan.findUnique({
          where: { id: existing.id },
          include: {
            items: {
              include: {
                category: {
                  select: { id: true, name: true, icon: true, color: true, budget: true },
                },
              },
            },
          },
        });
      }

      return tx.budgetPlan.create({
        data: {
          userId: user.id,
          year: dto.year,
          month: dto.month,
          items: {
            create: dto.items.map((item) => ({
              categoryId: item.categoryId,
              budget: item.budget,
            })),
          },
        },
        include: {
          items: {
            include: {
              category: {
                select: { id: true, name: true, icon: true, color: true, budget: true },
              },
            },
          },
        },
      });
    });

    this.logger.log(
      `Budget plan upserted for user ${user.id}: ${dto.year}-${dto.month}`,
    );

    return plan;
  }

  async delete(clerkId: string, id: string) {
    const user = await this.findUser(clerkId);
    await this.findOwnedPlan(id, user.id);

    await this.prisma.budgetPlan.delete({ where: { id } });

    this.logger.log(`Budget plan deleted: ${id}`);

    return { success: true };
  }

  private async findUser(clerkId: string) {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async findOwnedPlan(id: string, userId: string) {
    const plan = await this.prisma.budgetPlan.findFirst({
      where: { id, userId },
    });

    if (!plan) {
      throw new NotFoundException('Budget plan not found');
    }

    return plan;
  }
}
