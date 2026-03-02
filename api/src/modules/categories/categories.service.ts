import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(clerkId: string) {
    const user = await this.findUser(clerkId);

    const categories = await this.prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        transactions: {
          select: { amount: true },
          where: { amount: { lt: 0 } },
        },
      },
    });

    return categories.map((cat) => this.formatCategory(cat));
  }

  async create(clerkId: string, dto: CreateCategoryDto) {
    const user = await this.findUser(clerkId);

    const category = await this.prisma.category.create({
      data: {
        userId: user.id,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        budget: dto.budget,
      },
      include: { transactions: true },
    });

    this.logger.log(`Category created: ${category.id} for user ${user.id}`);

    return this.formatCategory(category);
  }

  async update(clerkId: string, id: string, dto: UpdateCategoryDto) {
    const user = await this.findUser(clerkId);
    await this.findOwnedCategory(id, user.id);

    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
      include: {
        transactions: {
          select: { amount: true },
          where: { amount: { lt: 0 } },
        },
      },
    });

    return this.formatCategory(category);
  }

  async delete(clerkId: string, id: string) {
    const user = await this.findUser(clerkId);
    await this.findOwnedCategory(id, user.id);

    await this.prisma.transaction.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

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
    transactions: { amount: bigint }[];
  }) {
    const spentMinorUnits = cat.transactions.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );

    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      budget: cat.budget,
      spent: Math.abs(spentMinorUnits) / 100,
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
