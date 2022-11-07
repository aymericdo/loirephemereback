import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RestaurantDocument = Restaurant & Document;

@Schema({ timestamps: true })
export class Restaurant {
  @Prop({ type: String, required: true, unique: true, maxLength: 100 })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    minLength: 3,
    maxLength: 100,
  })
  code: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);
