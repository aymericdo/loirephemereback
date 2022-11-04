import { MaxLength, IsNotEmpty, IsString } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  readonly name: string;
}
