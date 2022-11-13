import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Pastry } from 'src/pastries/schemas/pastry.schema';
import { Restaurant } from 'src/restaurants/schemas/restaurant.schema';

export type CommandDocument = Command & Document;

@Schema({ timestamps: true })
export class Command {
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Pastry' }] })
  pastries: Pastry[];

  @Prop({ type: { type: MongooseSchema.Types.ObjectId, ref: 'Restaurant' } })
  restaurant: Restaurant;

  @Prop({ type: String, required: true, minlength: 3, maxlength: 100 })
  name: string;

  @Prop({ type: Boolean, required: true, default: false })
  takeAway: boolean;

  @Prop({
    type: String,
    unique: true,
    required: true,
    minlength: 4,
    maxlength: 4,
  })
  reference: string;

  @Prop({ type: Boolean, required: true, default: false })
  isDone: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  isPayed: boolean;

  @Prop({ type: Number, required: true, min: 0 })
  totalPrice: number;

  @Prop({ type: Date, required: true, default: null, min: new Date() })
  pickUpTime: Date;
}

export const CommandSchema = SchemaFactory.createForClass(Command);
