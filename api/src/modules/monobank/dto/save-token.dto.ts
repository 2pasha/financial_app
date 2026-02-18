import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SaveTokenDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  token: string;
}
