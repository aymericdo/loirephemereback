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

  @Expose({ groups: ['admin'] })
  createdAt: Date;

  @Expose({ groups: ['admin'] })
  updatedAt: Date;

  @Expose({ groups: ['admin'] })
  @Transform(({ obj }) => {
    if (
      obj.forRestaurantId &&
      obj.access &&
      obj.access.hasOwnProperty(obj.forRestaurantId)
    ) {
      return obj.access[obj.forRestaurantId];
    } else {
      return obj.access || [];
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
