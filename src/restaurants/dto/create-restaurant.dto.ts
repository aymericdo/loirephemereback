import { MaxLength, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { SIZE } from 'src/helpers/sizes';

export class CreateRestaurantDto {
  @IsString()
  @MinLength(SIZE.MIN)
  @MaxLength(SIZE.SMALL)
  @IsNotEmpty()
  readonly name: string;
}
