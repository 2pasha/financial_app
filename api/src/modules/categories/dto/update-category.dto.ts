import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsArray, IsInt, IsBoolean } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  icon?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  mccCodes?: number[];

  @IsOptional()
  @IsBoolean()
  excludeFromDashboard?: boolean;
}
