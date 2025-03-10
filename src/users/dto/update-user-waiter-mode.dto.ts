import {
  IsString,
  IsMongoId,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';

export class UpdateWaiterModeUserDto {
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  readonly id: string;

  get _id(): string {
    return this.id;
  }

  @IsBoolean()
  @IsNotEmpty()
  readonly waiterMode: boolean;
}
