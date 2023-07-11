import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PAYMENT_TYPES } from 'src/commands/schemas/command.schema';

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

export class CommandPaymentDto {
  @IsArray()
  @IsNotEmpty()
  @Type(() => PaymentDto)
  @ValidateNested({ each: true })
  readonly payments: PaymentDto[];
}
