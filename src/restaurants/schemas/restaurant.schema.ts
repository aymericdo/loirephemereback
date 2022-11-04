import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RestaurantDocument = Restaurant & Document;

@Schema({ timestamps: true })
export class Restaurant {
  @Prop({ type: String, required: true, maxLength: 100 })
  name: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);
