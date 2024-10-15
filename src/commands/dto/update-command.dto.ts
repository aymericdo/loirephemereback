import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsMongoId, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { CreateCommandDto } from './create-command.dto';
import { SIZE } from 'src/shared/helpers/sizes';

export class UpdateCommandDto extends PartialType(CreateCommandDto) {
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  readonly id: string;

  @IsString()
  @MinLength(SIZE.MIN)
  @MaxLength(SIZE.SMALL)
  @IsNotEmpty()
  readonly restaurant: string;

  get _id(): string {
    return this.id;
  }
}
