import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateIncomeDto {
  @IsString()
  @IsOptional()
  source?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;
}
