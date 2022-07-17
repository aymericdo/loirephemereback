import { Pastry } from 'src/pastries/schemas/pastry.interface';

export interface Command {
  _id?: string;
  pastries: Pastry[];
  name: string;
  reference?: string;
  createdAt?: string;
  updatedAt?: string;
  isDone?: boolean;
  isPayed?: boolean;
}
