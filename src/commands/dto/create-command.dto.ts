import {
  ValidateNested,
  MaxLength,
  IsNotEmpty,
  IsString,
  IsDate,
} from 'class-validator';
import { Pastry } from 'src/pastries/schemas/pastry.schema';

export class CreateCommandDto {
  @ValidateNested()
  @IsNotEmpty()
  readonly pastries: Pastry[];

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  readonly table: string;

  @IsDate()
  @IsNotEmpty()
  readonly dateTime: string;
}
