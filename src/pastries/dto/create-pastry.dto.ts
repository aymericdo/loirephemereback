import {
  MaxLength,
  IsNotEmpty,
  IsString,
  IsBoolean,
  MinLength,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';

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
  readonly imageUrl: string;

  @IsString({ each: true })
  @MaxLength(100)
  readonly ingredients: string[];

  @IsNumber()
  @Min(0)
  readonly stock: number;

  @IsBoolean()
  readonly hidden: boolean;

  @IsNumber()
  @Min(0)
  readonly displaySequence: number;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  readonly commonStock: string;
}
