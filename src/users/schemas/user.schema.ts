import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SIZE } from 'src/shared/helpers/sizes';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    unique: true,
    required: true,
    minlength: SIZE.MIN,
    maxlength: SIZE.SMALL,
  })
  email: string;

  @Prop({
    type: String,
    required: true,
    minlength: SIZE.MIN_PASSWORD,
    maxlength: SIZE.LARGE,
  })
  password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
