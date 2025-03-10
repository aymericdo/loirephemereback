import {
  IsString,
  IsMongoId,
  IsNotEmpty,
  IsArray,
  ArrayMaxSize,
  IsEnum,
} from 'class-validator';
import { Access, ACCESS_LIST } from 'src/users/schemas/user.schema';

export class UpdateAccessUserDto {
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  readonly id: string;

  get _id(): string {
    return this.id;
  }

  @IsArray()
  @IsString({ each: true })
  @IsEnum(ACCESS_LIST, { each: true })
  @ArrayMaxSize(4)
  readonly access: Access[];
}
