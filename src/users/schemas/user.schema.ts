import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SIZE } from 'src/shared/helpers/sizes';

export const ACCESS_LIST = ['menu', 'commands', 'stats', 'users'] as const;
export type Access = typeof ACCESS_LIST[number];

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    required: true,
    lowercase: true,
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

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  access: { [restaurantId: string]: Access[] };

  @Prop({
    type: Boolean,
    required: true,
    default: true,
  })
  displayDemoResto: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { email: 1 },
  { collation: { locale: 'fr', strength: 1 }, unique: true },
);
