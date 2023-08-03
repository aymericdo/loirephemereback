import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { Pastry, PastryDocument } from 'src/pastries/schemas/pastry.schema';
import {
  Restaurant,
  RestaurantDocument,
} from 'src/restaurants/schemas/restaurant.schema';
import { SIZE } from 'src/shared/helpers/sizes';

export type CommandDocument = Command & Document;

export const PAYMENT_TYPES = ['creditCart', 'cash', 'bankCheque'] as const;
export type PaymentType = typeof PAYMENT_TYPES[number];

export interface PaymentPossibility {
  key: PaymentType;
  value: number;
}

export interface Discount {
  gifts: string[];
  percentage: number;
  newPrice: number;
}

@Schema({ timestamps: true })
export class Command {
  @Prop({
    type: [{ type: SchemaTypes.ObjectId, ref: Pastry.name }],
    required: true,
    validate: [
      {
        validator: (val: string) => val.length <= 100,
        msg: '{PATH} exceeds the limit of 100',
      },
      {
        validator: (val: string) => val.length > 0,
        msg: '{PATH} is less than 1',
      },
    ],
  })
  pastries: PastryDocument[];

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
    minlength: SIZE.EXTRA_MIN,
    maxlength: SIZE.SMALL,
  })
  name: string;

  @Prop({ type: Boolean, required: true, default: false })
  takeAway: boolean;

  @Prop({
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    minlength: 4,
    maxlength: 4,
  })
  reference: string;

  @Prop({ type: Boolean, required: true, default: false })
  isDone: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  isPayed: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  isCancelled: boolean;

  @Prop({ type: Number, required: true, min: 0 })
  totalPrice: number;

  @Prop({ type: Date, default: null, min: new Date() })
  pickUpTime: Date;

  @Prop({
    type: [{ type: Object }],
    required: true,
    default: [],
  })
  payment: PaymentPossibility[];

  @Prop({
    type: Object,
    required: false,
  })
  discount: Discount;

  get isCancellable(): boolean {
    return !this.isDone && !this.isPayed;
  }
}

export const CommandSchema = SchemaFactory.createForClass(Command);
