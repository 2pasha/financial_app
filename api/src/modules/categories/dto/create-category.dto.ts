import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsArray, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  icon: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsNumber()
  @Min(0)
  budget: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  mccCodes?: number[];
}
