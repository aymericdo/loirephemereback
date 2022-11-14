import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SIZE } from 'src/helpers/sizes';

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
