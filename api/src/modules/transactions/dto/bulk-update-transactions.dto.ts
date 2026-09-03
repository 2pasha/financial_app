import { IsArray, ArrayNotEmpty, IsString, IsOptional } from 'class-validator';

export class BulkUpdateTransactionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  tripId?: string | null;
}
