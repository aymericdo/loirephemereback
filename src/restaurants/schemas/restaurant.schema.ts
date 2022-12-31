import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { SIZE } from 'src/shared/helpers/sizes';
import { User, UserDocument } from 'src/users/schemas/user.schema';

export type RestaurantDocument = Restaurant & Document;

@Schema({ timestamps: true })
export class Restaurant {
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: SIZE.MIN,
    maxlength: SIZE.SMALL,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: SIZE.MIN,
    maxlength: SIZE.SMALL,
  })
  code: string;

  @Prop({
    type: [{ type: SchemaTypes.ObjectId, ref: User.name }],
    required: true,
    validate: [(val: string) => val.length > 0, '{PATH} is less than 1'],
  })
  users: UserDocument[];
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index(
  { name: 1 },
  { collation: { locale: 'fr', strength: 1 }, unique: true },
);

RestaurantSchema.index(
  { code: 1 },
  { collation: { locale: 'fr', strength: 1 }, unique: true },
);
