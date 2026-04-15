import { IsInt, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateIncomeDto {
  @IsString()
  @IsNotEmpty()
  source: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
