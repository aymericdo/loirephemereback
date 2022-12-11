import { PartialType } from '@nestjs/mapped-types';
import { MaxLength, IsNotEmpty, Matches, MinLength } from 'class-validator';
import { REGEX } from 'src/shared/helpers/regex';
import { SIZE } from 'src/shared/helpers/sizes';
import { EmailUserDto } from 'src/users/dto/email-user.dto';

export class CreateUserDto extends PartialType(EmailUserDto) {
  @MinLength(SIZE.MIN_PASSWORD)
  @MaxLength(SIZE.LARGE)
  @Matches(REGEX.PASSWORD)
  @IsNotEmpty()
  readonly password: string;

  @MinLength(4)
  @MaxLength(4)
  @IsNotEmpty()
  readonly emailCode: string;

  @MinLength(4)
  @MaxLength(4)
  @IsNotEmpty()
  readonly code2: string;
}
