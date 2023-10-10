import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Discount, PAYMENT_TYPES } from 'src/commands/schemas/command.schema';

export class PaymentDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(PAYMENT_TYPES)
  readonly key: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  readonly value: number;
}

export class DiscountDto {
  @IsArray()
  @Type(() => String)
  @ValidateNested({ each: true })
  readonly gifts: string[];

  @IsNumber()
  @Min(1)
  readonly percentage: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  readonly newPrice: number;
}

export class CommandPaymentDto {
  @IsArray()
  @IsNotEmpty()
  @Type(() => PaymentDto)
  @ValidateNested({ each: true })
  readonly payments: PaymentDto[];

  @IsObject()
  @IsOptional()
  @Type(() => DiscountDto)
  readonly discount: Discount | null;
}
