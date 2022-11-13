import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Restaurant } from 'src/restaurants/schemas/restaurant.schema';

export type PastryDocument = Pastry & Document;

@Schema({ timestamps: true })
export class Pastry {
  @Prop({
    type: String,
    required: true,
    minLength: 3,
    maxLength: 100,
  })
  name: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: String, required: true, minlength: 10, maxlength: 500 })
  description: string;

  @Prop({ type: String })
  imageUrl: string;

  @Prop({ type: [String], maxlength: 50 })
  ingredients: string[];

  @Prop({ type: Number, min: 0 })
  stock: number;

  @Prop({ type: Boolean, default: false })
  hidden: boolean;

  @Prop({ type: Number, min: 0 })
  displaySequence: number;

  @Prop({ type: String })
  type: 'drink' | 'pastry' | 'tip';

  // Props to join stock of several pastries
  @Prop({ type: String, minlength: 3, maxlength: 50 })
  commonStock: string;

  @Prop({ type: { type: MongooseSchema.Types.ObjectId, ref: 'Restaurant' } })
  restaurant: Restaurant;
}

export const PastrySchema = SchemaFactory.createForClass(Pastry);

PastrySchema.index(
  { restaurant: 1, name: 1 },
  { collation: { locale: 'fr', strength: 1 }, unique: true },
);

PastrySchema.index({ restaurant: 1, displaySequence: 1 }, { unique: true });
