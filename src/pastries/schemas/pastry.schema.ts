import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import {
  Restaurant,
  RestaurantDocument,
} from 'src/restaurants/schemas/restaurant.schema';
import { SIZE } from 'src/shared/helpers/sizes';

export type PastryDocument = Pastry & Document;

export const PASTRY_TYPES = ['pastry', 'drink', 'tip', 'other'] as const;
type PastryType = typeof PASTRY_TYPES[number];

export const statsAttributes = ['price', 'type'];
export interface Historical {
  date: Date;
  price?: [number, number];
  type?: [string | null, string];
}

@Schema({ timestamps: true })
export class Pastry {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Restaurant.name,
    required: true,
  })
  restaurant: RestaurantDocument;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minLength: SIZE.MIN,
    maxLength: SIZE.SMALL,
  })
  name: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: SIZE.MIN,
    maxlength: SIZE.LARGE,
  })
  description: string;

  @Prop({ type: String })
  imageUrl: string;

  @Prop({
    type: [
      { type: String, maxlength: SIZE.SMALL, trim: true, lowercase: true },
    ],
    validate: [
      (val: string) => val.length <= SIZE.MEDIUM,
      `{PATH} exceeds the limit of ${SIZE.MEDIUM}`,
    ],
  })
  ingredients: string[];

  @Prop({ type: Number, min: 0 })
  stock: number;

  @Prop({ type: Boolean, default: false })
  hidden: boolean;

  @Prop({ type: Number, min: 0, required: true })
  displaySequence: number;

  @Prop({ type: String })
  type: PastryType;

  // Props to join stock of several pastries
  @Prop({ type: String, minlength: SIZE.MIN, maxlength: SIZE.MEDIUM })
  commonStock: string;

  @Prop({
    type: [{ type: Object }],
    default: [],
  })
  historical: Historical[];
}

export const PastrySchema = SchemaFactory.createForClass(Pastry);

PastrySchema.index(
  { restaurant: 1, name: 1 },
  { collation: { locale: 'fr', strength: 1 }, unique: true },
);

PastrySchema.index({ restaurant: 1, displaySequence: 1 }, { unique: true });
