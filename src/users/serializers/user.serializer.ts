import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { Access } from 'src/users/schemas/user.schema';

export class UserEntity {
  @Expose()
  @Transform((params) => params.obj._id.toString())
  id: ObjectId;

  @Expose()
  email: string;

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

  constructor(partial: Partial<UserEntity>, forRestaurantId = null) {
    Object.assign(this, partial);

    this.forRestaurantId = forRestaurantId;
  }
}
