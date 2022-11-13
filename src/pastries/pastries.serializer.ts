import { Exclude, Expose } from 'class-transformer';
import { Restaurant } from 'src/restaurants/schemas/restaurant.schema';

export class PastryEntity {
  @Exclude()
  _id: string;

  @Exclude()
  restaurant: Restaurant;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

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
  get id(): string {
    return `${this._id}`;
  }

  constructor(partial: Partial<PastryEntity>) {
    const variablesToAssign = [
      'name',
      'description',
      'price',
      'stock',
      'imageUrl',
      'ingredients',
      'hidden',
      'displaySequence',
      'type',
    ];

    variablesToAssign.forEach((variable) => {
      if (!partial.hasOwnProperty(variable)) {
        partial[variable] = null;
      }

      Object.assign(this, { [variable]: partial[variable] });
    });
  }
}
