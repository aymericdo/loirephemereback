import { Type } from 'class-transformer';
import {
  ValidateNested,
  MaxLength,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsDate,
  MinLength,
  IsOptional,
  IsArray,
} from 'class-validator';
import { SIZE } from 'src/shared/helpers/sizes';
import { IsInFuture } from 'src/shared/decorators/validators/date-is-in-future.decorator';
import { CommandPastryDto } from 'src/pastries/dto/command-pastry.dto';

export class CreateCommandDto {
  @IsArray()
  @IsNotEmpty()
  @Type(() => CommandPastryDto)
  @ValidateNested({ each: true })
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
