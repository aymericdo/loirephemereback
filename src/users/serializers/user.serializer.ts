import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';

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

  // never
  @Exclude()
  _id: number;

  @Exclude()
  __v: number;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}