import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class UpdateTripItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  text?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
