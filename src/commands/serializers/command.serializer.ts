import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import {
  CancelledByType,
  Discount,
  PaymentPossibility,
} from 'src/commands/schemas/command.schema';
import { Pastry, PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { PastryEntity } from 'src/pastries/serializers/pastry.serializer';
import { Restaurant } from 'src/restaurants/schemas/restaurant.schema';
import { RestaurantEntity } from 'src/restaurants/serializer/restaurant.serializer';

export class CommandEntity {
  @Expose()
  @Transform(({ obj }) => obj._id.toString())
  id: ObjectId;

  @Expose()
  @Transform(({ value }) => {
    return value.map((pastry: PastryDocument) => new PastryEntity(pastry));
  })
  pastries: Pastry[];

  @Expose()
  name: string;

  @Expose()
  reference: string;

  @Expose()
  takeAway: boolean;

  @Expose()
  isDone: boolean;

  @Expose()
  isPayed: boolean;

  @Expose()
  isCancelled: boolean;

  @Expose()
  totalPrice: number;

  @Expose()
  pickUpTime: Date;

  @Expose()
  paymentRequired: boolean;

  @Expose()
  @Transform(({ obj }) => obj.restaurant?.paymentInformation?.paymentActivated || false)
  paymentActivated: boolean;

  @Expose({ groups: ['admin'] })
  payment: PaymentPossibility[];

  @Expose({ groups: ['admin'] })
  cancelledBy: CancelledByType;

  @Expose({ groups: ['admin'] })
  discount: Discount | null;

  @Expose({ groups: ['admin'] })
  mergedCommandIds: string[] | null;

  @Expose()
  createdAt: Date;

  @Expose({ groups: ['admin'] })
  updatedAt: Date;

  // never
  @Exclude()
  _id: number;

  @Exclude()
  sessionId: string;

  @Exclude()
  @Transform(({ value }) => new RestaurantEntity(value))
  restaurant: Restaurant;

  @Exclude()
  __v: number;

  constructor(partial: Partial<CommandEntity>) {
    Object.assign(this, partial);
  }
}
