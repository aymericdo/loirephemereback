import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { SIZE } from 'src/shared/helpers/sizes';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { UserEntity } from 'src/users/serializers/user.serializer';

export class RestaurantEntity {
  @Expose()
  @Transform(({ obj }) => obj._id.toString())
  id: ObjectId;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  openingTime: Date;

  @Expose()
  openingPickTime: Date;

  @Expose({ groups: ['admin'] })
  createdAt: Date;

  @Expose({ groups: ['admin'] })
  updatedAt: Date;

  @Expose({ groups: ['admin'] })
  displayStock: boolean;

  @Expose({ groups: ['admin'] })
  alwaysOpen: boolean;

  @Expose({ groups: ['admin'] })
  @Transform(({ value }) => {
    return value?.publicKey && value?.secretKey ? {
      ...value,
      publicKey: '*'.repeat(SIZE.STRIPE_KEY),
      secretKey: '*'.repeat(SIZE.STRIPE_KEY),
    } : null
  })
  paymentInformation: Object

  // never
  @Exclude()
  _id: number;

  @Exclude()
  @Transform(({ value }) => {
    return value.map((user: UserDocument) => new UserEntity(user));
  })
  users: User[];

  @Exclude()
  __v: number;

  constructor(partial: RestaurantDocument) {
    Object.assign(this, partial);
  }
}
