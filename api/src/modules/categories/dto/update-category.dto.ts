import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsArray, IsInt, IsBoolean } from 'class-validator';

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

  // year and month must be provided together (or both null to make the category repeating).
  // @IsOptional() lets an explicit null through so a one-month category can be promoted.
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number | null;
}
