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

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  // with 0 as a monday (I'm not a savage)
  openingTime: {
    [weekDay: number]: { startTime: string; endTime: string };
  };

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  // with 0 as a monday (I'm not a savage)
  openingPickupTime: {
    [weekDay: number]: { startTime: string };
  };

  @Prop({
    type: Boolean,
    required: true,
    default: true,
  })
  displayStock: boolean;

  @Prop({
    type: Boolean,
    required: true,
    default: false,
  })
  alwaysOpen: boolean;

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  paymentInformation: {
    type: 'Stripe',
    paymentActivated: boolean,
    paymentRequired: boolean,
    publicKey: string,
    secretKey: string,
  }
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
