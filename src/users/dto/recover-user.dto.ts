import { PartialType } from '@nestjs/mapped-types';
import { MaxLength, IsNotEmpty, MinLength } from 'class-validator';
import { EmailUserDto } from 'src/users/dto/email-user.dto';

export class RecoverUserDto extends PartialType(EmailUserDto) {
  @MaxLength(4)
  @IsNotEmpty()
  readonly emailCode: string;

  @MinLength(4)
  @MaxLength(4)
  @IsNotEmpty()
  readonly code2: string;
}
