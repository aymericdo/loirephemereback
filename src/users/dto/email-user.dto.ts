import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

export class EmailUserDto extends PartialType(
  OmitType(CreateUserDto, [
    'password',
    'emailCode',
    'code2',
    'password',
  ] as const),
) {}
