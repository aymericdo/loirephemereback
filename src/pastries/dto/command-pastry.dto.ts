import { PartialType } from '@nestjs/mapped-types';
import { UpdatePastryDto } from 'src/pastries/dto/update-pastry.dto';

export class CommandPastryDto extends PartialType(UpdatePastryDto) {
  get _id(): string {
    return this.id;
  }
}
