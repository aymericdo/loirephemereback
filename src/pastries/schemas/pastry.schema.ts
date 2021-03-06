import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PastryDocument = Pastry & Document;

@Schema()
export class Pastry {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  imageLink: string;

  @Prop({ type: [String] })
  ingredients: string[];

  @Prop({ type: Number })
  stock: number;

  @Prop({ type: Boolean, default: false })
  hidden: boolean;

  @Prop({ type: String })
  commonStock: string;
}

export const PastrySchema = SchemaFactory.createForClass(Pastry);
