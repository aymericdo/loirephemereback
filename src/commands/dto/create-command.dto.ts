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

export class CreateCommandDto {
  @ValidateNested()
  @IsNotEmpty()
  readonly pastries: Pastry[];

  @IsString()
  @MinLength(3)
  @MaxLength(100)
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
