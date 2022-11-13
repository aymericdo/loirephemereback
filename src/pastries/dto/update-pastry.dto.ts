import { PartialType } from '@nestjs/mapped-types';
import { CreatePastryDto } from './create-pastry.dto';

export class UpdatePastryDto extends PartialType(CreatePastryDto) {}
