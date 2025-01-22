import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { UpdatePastryDto } from 'src/pastries/dto/update-pastry.dto';
import {
  Restaurant,
  RestaurantDocument,
} from 'src/restaurants/schemas/restaurant.schema';
import { SIZE } from 'src/shared/helpers/sizes';

export type PastryDocument = Pastry & Document;

export const PASTRY_TYPES = ['pastry', 'drink', 'tip', 'other'] as const;
export type PastryType = (typeof PASTRY_TYPES)[number];

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

  get isInfiniteStock(): boolean {
    return this.stock === null;
  }

  isStatsAttributesChanged: Function;
  getStatsAttributesChanged: Function;
}

export const PastrySchema = SchemaFactory.createForClass(Pastry);

PastrySchema.methods.isStatsAttributesChanged = function (newPastry: UpdatePastryDto): boolean {
  return statsAttributes.some((attribute: string) => {
    return this[attribute] !== newPastry[attribute];
  });
};

PastrySchema.methods.getStatsAttributesChanged = function (newPastry: UpdatePastryDto): Historical {
  const historical: Historical = {
    date: new Date(),
  };

  statsAttributes.forEach((attribute: string) => {
    if (this[attribute] !== newPastry[attribute]) {
      historical[attribute] = [this[attribute], newPastry[attribute]];
    }
  });

  return historical;
};

PastrySchema.index(
  { restaurant: 1, name: 1 },
  { collation: { locale: 'fr', strength: 1 }, unique: true },
);

PastrySchema.index({ restaurant: 1, displaySequence: 1 }, { unique: true });

