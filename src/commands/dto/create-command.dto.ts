import {
  ValidateNested,
  MaxLength,
  Length,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsDate,
  MinDate,
  MinLength,
} from 'class-validator';
import { SIZE } from 'src/helpers/sizes';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';

export class CreateCommandDto {
  @ValidateNested()
  @IsNotEmpty()
  readonly pastries: PastryDocument[];

  @IsString()
  @MinLength(SIZE.MIN)
  @MaxLength(SIZE.SMALL)
  @IsNotEmpty()
  readonly name: string;

  @IsBoolean()
  @IsNotEmpty()
  readonly takeAway: boolean;

  @IsDate()
  @MinDate(new Date())
  readonly pickUpTime: Date;

  @IsString()
  @Length(4, 4)
  @IsNotEmpty()
  readonly reference: string;
}
