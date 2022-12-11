import { MaxLength, IsNotEmpty, MinLength, IsEmail } from 'class-validator';
import { SIZE } from 'src/shared/helpers/sizes';

export class EmailUserDto {
  @IsEmail()
  @MinLength(SIZE.MIN)
  @MaxLength(SIZE.SMALL)
  @IsNotEmpty()
  readonly email: string;
}
