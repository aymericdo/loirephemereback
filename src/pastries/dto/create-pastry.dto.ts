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
import { SIZE } from 'src/helpers/sizes';

export class CreatePastryDto {
  @IsString()
  @MinLength(SIZE.MIN)
  @MaxLength(SIZE.SMALL)
  @IsNotEmpty()
  readonly name: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  readonly price: number;

  @IsString()
  @MinLength(SIZE.MIN)
  @MaxLength(SIZE.LARGE)
  @IsNotEmpty()
  readonly description: string;

  @IsString()
  @IsOptional()
  @MinLength(SIZE.MIN)
  readonly imageUrl: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(SIZE.SMALL, { each: true })
  @ArrayMaxSize(SIZE.MEDIUM)
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
  @MinLength(SIZE.MIN)
  @MaxLength(SIZE.MEDIUM)
  readonly commonStock: string;

  @IsString()
  @IsEnum(pastryTypes)
  readonly type: string;
}
