import { Pastry } from 'src/pastries/interfaces/pastry.interface';

export interface Command {
  pastries: Pastry[];
  table: string;
  dateTime: string;
}
