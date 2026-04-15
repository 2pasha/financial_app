import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BudgetPlanItemDto {
  @IsUUID()
  categoryId: string;

  @IsNumber()
  @Min(0)
  budget: number;
}

export class UpsertBudgetPlanDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetPlanItemDto)
  items: BudgetPlanItemDto[];

}
