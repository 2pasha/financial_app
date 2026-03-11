import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateIncomeDto {
  @IsString()
  @IsNotEmpty()
  source: string;

  @IsNumber()
  @Min(0)
  amount: number;
}
