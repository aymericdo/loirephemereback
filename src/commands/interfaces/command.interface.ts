import { Pastry } from '../../../dist/pastries/pastry.interface';

export interface Command {
  pastries: Pastry[];
  table: string;
  dateTime: string;
}
