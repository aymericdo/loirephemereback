import { Transform, Type } from 'class-transformer';
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
import { IsInFuture } from 'src/shared/decorators/validators/date-is-in-future.decorator';
import { CommandPastryDto } from 'src/pastries/dto/command-pastry.dto';

export class CreateCommandDto {
  currentDate: Date = new Date();

  @ValidateNested()
  @IsNotEmpty()
  @Transform(({ obj }) => obj.pastries.map((p) => ({ ...p, _id: p.id })))
  readonly pastries: CommandPastryDto[];

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
  @Type(() => Date)
  @IsDate()
  readonly pickUpTime: Date;
}
