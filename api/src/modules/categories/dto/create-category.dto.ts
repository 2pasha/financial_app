import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsArray, IsInt, IsBoolean, ValidateIf } from 'class-validator';

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

  // year and month must be provided together or not at all
  @ValidateIf((o) => o.month !== undefined)
  @IsInt()
  @Min(2000)
  year?: number;

  @ValidateIf((o) => o.year !== undefined)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsBoolean()
  excludeFromDashboard?: boolean;
}
