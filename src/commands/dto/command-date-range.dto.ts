import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class CommandDateRangeDto {
  @Type(() => Date)
  @IsDate()
  readonly fromDate: Date;

  @Type(() => Date)
  @IsDate()
  readonly toDate: Date;
}
