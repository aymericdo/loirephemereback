import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { Historical, PastryDocument } from 'src/pastries/schemas/pastry.schema';
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

  @Transform(({ obj, options }) => {
    if (options.groups?.includes('admin') || obj.displayStock) {
      return obj.stock;
    } else {
      return null;
    }
  })
  stock: number;

  @Expose()
  imageUrl: string;

  @Expose()
  ingredients: string[];

  @Expose()
  displaySequence: number;

  @Expose({ groups: ['admin'] })
  hidden: boolean;

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

  @Exclude()
  displayStock = null;

  constructor(partial: PastryDocument, displayStock = false) {
    Object.assign(this, partial);

    this.displayStock = displayStock;
  }
}
