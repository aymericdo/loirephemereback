import { Transform } from 'class-transformer';
import {
  ValidateNested,
  MaxLength,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsDate,
  MinLength,
  IsOptional,
} from 'class-validator';
import { SIZE } from 'src/shared/helpers/sizes';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { IsInFuture } from 'src/shared/validators/date-is-in-future.decorator';

export class CreateCommandDto {
  currentDate: Date = new Date();

  @ValidateNested()
  @IsNotEmpty()
  readonly pastries: PastryDocument[];

  @IsString()
  @MinLength(SIZE.MIN)
  @MaxLength(SIZE.SMALL)
  @IsNotEmpty()
  readonly name: string;

  @IsBoolean()
  @IsNotEmpty()
  readonly takeAway: boolean;

  @IsOptional()
  @IsInFuture()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  readonly pickUpTime: Date;
}
