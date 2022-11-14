import {
  MaxLength,
  IsNotEmpty,
  IsString,
  IsBoolean,
  MinLength,
  IsNumber,
  Min,
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { pastryTypes } from 'src/pastries/schemas/pastry.schema';

export class CreatePastryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsNotEmpty()
  readonly name: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  readonly price: number;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @IsNotEmpty()
  readonly description: string;

  @IsString()
  @MinLength(4)
  readonly imageUrl: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(100)
  readonly ingredients: string[];

  @IsBoolean()
  readonly hidden: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  readonly stock: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  readonly displaySequence: number;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  readonly commonStock: string;

  @IsString()
  @IsEnum(pastryTypes)
  readonly type: string;
}
