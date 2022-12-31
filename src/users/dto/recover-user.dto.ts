import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

export class RecoverUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
