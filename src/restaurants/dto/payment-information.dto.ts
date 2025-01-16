import { IsString, IsNotEmpty, Length, IsBoolean, IsOptional } from "class-validator";
import { SIZE } from "src/shared/helpers/sizes";

export class PaymentInformationDto {
  @IsBoolean()
  @IsNotEmpty()
  readonly paymentActivated: boolean;

  @IsBoolean()
  @IsNotEmpty()
  readonly paymentRequired: boolean;

  @IsString()
  @Length(SIZE.STRIPE_KEY)
  @IsOptional()
  readonly publicKey: string;

  @IsString()
  @Length(SIZE.STRIPE_KEY)
  @IsOptional()
  readonly secretKey: string;
}