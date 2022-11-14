import { Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { Restaurant } from 'src/restaurants/schemas/restaurant.schema';

export class PastryEntity {
  @Expose()
  @Transform((params) => params.obj._id.toString())
  _id: ObjectId;

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

  @Expose()
  type: string;

  @Expose()
  restaurant: Restaurant;

  constructor(partial: Partial<PastryEntity>) {
    Object.assign(this, partial);
  }
}
