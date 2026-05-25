import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTripItemDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
