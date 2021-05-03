import { Injectable } from '@nestjs/common';
import { Pastry } from './pastry.interface';

@Injectable()
export class PastriesService {
  getAll(): Pastry[] {
    return [
      {
        name: 'Cookie',
        price: 3,
        description:
          'Chocolat, noix de pécan, caramel au beurre salé, praliné pécan',
        stock: 9,
      },
    ];
  }
}
