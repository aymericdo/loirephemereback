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
import { Pastry } from 'src/pastries/schemas/pastry.schema';
import { SIZE } from 'src/helpers/sizes';

export class CreateCommandDto {
  @ValidateNested()
  @IsNotEmpty()
  readonly pastries: Pastry[];

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
