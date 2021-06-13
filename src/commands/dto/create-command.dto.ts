import {
  ValidateNested,
  MaxLength,
  Length,
  IsNotEmpty,
  IsString,
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

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @Length(14, 14)
  @IsNotEmpty()
  readonly reference: string;
}
