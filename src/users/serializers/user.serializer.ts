import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class UserEntity {
  @Expose()
  @Transform((params) => params.obj._id.toString())
  _id: ObjectId;

  @Expose()
  email: string;

  @Expose({ groups: ['admin'] })
  createdAt: string;

  @Expose({ groups: ['admin'] })
  updatedAt: string;

  // never
  @Exclude()
  __v: number;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
