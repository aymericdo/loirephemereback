import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { UserEntity } from 'src/users/serializers/user.serializer';

export class RestaurantEntity {
  @Expose()
  @Transform((params) => params.obj._id.toString())
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
