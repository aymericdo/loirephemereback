import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { Access, UserDocument } from 'src/users/schemas/user.schema';

export class UserEntity {
  @Expose()
  @Transform(({ obj }) => obj._id.toString())
  id: ObjectId;

  @Expose()
  email: string;

  @Expose()
  displayDemoResto: boolean;

  @Expose()
  @Transform(({ obj }) => {
    if (obj.forRestaurantId) {
      return (obj.waiterMode && obj.waiterMode[obj.forRestaurantId]) ?? false;
    } else {
      return obj.waiterMode ?? {};
    }
  })
  waiterMode: { [restaurantId: string]: boolean } | boolean;

  @Expose({ groups: ['admin'] })
  createdAt: Date;

  @Expose({ groups: ['admin'] })
  updatedAt: Date;

  @Expose({ groups: ['admin'] })
  @Transform(({ obj }) => {
    if (obj.forRestaurantId) {
      return (obj.access && obj.access[obj.forRestaurantId]) ?? false;
    } else {
      return obj.access ?? {};
    }
  })
  access: { [restaurantId: string]: Access[] } | Access[];

  // never
  @Exclude()
  _id: number;

  @Exclude()
  __v: number;

  @Exclude()
  password: string;

  @Exclude()
  forRestaurantId = null;

  constructor(partial: UserDocument, forRestaurantId = null) {
    Object.assign(this, partial);

    this.forRestaurantId = forRestaurantId;
  }
}
