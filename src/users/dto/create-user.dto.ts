import {
  MaxLength,
  IsNotEmpty,
  Matches,
  MinLength,
  IsEmail,
  IsString,
} from 'class-validator';
import { REGEX } from 'src/shared/helpers/regex';
import { SIZE } from 'src/shared/helpers/sizes';

export class CreateUserDto {
  @IsEmail()
  @MinLength(SIZE.MIN)
  @MaxLength(SIZE.SMALL)
  @IsNotEmpty()
  readonly email: string;

  @MinLength(SIZE.MIN_PASSWORD)
  @MaxLength(SIZE.LARGE)
  @Matches(REGEX.PASSWORD)
  @IsNotEmpty()
  readonly password: string;

  @IsString()
  @MinLength(4)
  @MaxLength(4)
  @IsNotEmpty()
  readonly emailCode: string;

  @IsString()
  @MinLength(4)
  @MaxLength(4)
  @IsNotEmpty()
  readonly code2: string;
}
