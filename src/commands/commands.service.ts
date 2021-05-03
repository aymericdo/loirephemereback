import { Injectable } from '@nestjs/common';
import { Command } from './interfaces/command.interface';

@Injectable()
export class CommandsService {
  getAll(): Command[] {
    return [
      {
        pastries: [
          {
            name: 'Cookie',
            price: 3,
            description:
              'Chocolat, noix de pécan, caramel au beurre salé, praliné pécan',
            stock: 9,
          },
        ],
        table: 'table 12',
        dateTime: '2021-02-18T15:35:28.433Z',
      },
    ];
  }
}
