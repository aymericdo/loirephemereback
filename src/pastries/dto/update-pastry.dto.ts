import { PartialType } from '@nestjs/mapped-types';
import {
  IsNumber,
  IsNotEmpty,
  Min,
  IsString,
  IsMongoId,
} from 'class-validator';
import { CreatePastryDto } from './create-pastry.dto';

export class UpdatePastryDto extends PartialType(CreatePastryDto) {
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  readonly id: string;

  get _id(): string {
    return this.id;
  }

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  readonly displaySequence: number;
}
