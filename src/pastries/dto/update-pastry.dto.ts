import { PartialType } from '@nestjs/mapped-types';
import {
  IsNumber,
  IsNotEmpty,
  Min,
  IsString,
  IsMongoId,
} from 'class-validator';
import { ObjectId } from 'mongoose';
import { CreatePastryDto } from './create-pastry.dto';

export class UpdatePastryDto extends PartialType(CreatePastryDto) {
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  readonly _id: ObjectId;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  readonly displaySequence: number;
}
