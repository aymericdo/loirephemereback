import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';
import { CommandDateRangeDto } from 'src/commands/dto/command-date-range.dto';
import { IsToday } from 'src/shared/decorators/validators/date-is-today.decorator';

export class CommandDateRangeLast24hoursDto extends PartialType(
  CommandDateRangeDto,
) {
  @Type(() => Date)
  @IsDate()
  @IsToday()
  readonly fromDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsToday()
  readonly toDate: Date;
}
