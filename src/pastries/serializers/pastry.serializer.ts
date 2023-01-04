import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { Historical } from 'src/pastries/schemas/pastry.schema';
import { Restaurant } from 'src/restaurants/schemas/restaurant.schema';
import { RestaurantEntity } from 'src/restaurants/serializer/restaurant.serializer';

export class PastryEntity {
  @Expose()
  @Transform((params) => params.obj._id.toString())
  id: ObjectId;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  price: number;

  @Expose()
  stock: number;

  @Expose()
  imageUrl: string;

  @Expose()
  ingredients: string[];

  @Expose()
  hidden: boolean;

  @Expose()
  displaySequence: number;

  @Expose({ groups: ['admin'] })
  commonStock: string;

  @Expose({ groups: ['admin'] })
  type: string;

  @Expose({ groups: ['admin'] })
  createdAt: Date;

  @Expose({ groups: ['admin'] })
  updatedAt: Date;

  @Expose({ groups: ['admin'] })
  historical: Historical[];

  // never
  @Exclude()
  _id: number;

  @Exclude()
  @Transform(({ value }) => new RestaurantEntity(value))
  restaurant: Restaurant;

  @Exclude()
  __v: number;

  constructor(partial: Partial<PastryEntity>) {
    Object.assign(this, partial);
  }
}
