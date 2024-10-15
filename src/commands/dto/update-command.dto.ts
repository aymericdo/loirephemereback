import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsMongoId, IsNotEmpty } from 'class-validator';
import { CreateCommandDto } from './create-command.dto';

export class CommandDto extends PartialType(CreateCommandDto) {
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  readonly id: string;

  get _id(): string {
    return this.id;
  }
}
