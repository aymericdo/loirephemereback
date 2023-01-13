import { SetMetadata } from '@nestjs/common';
import { Access } from 'src/users/schemas/user.schema';

export const Accesses = (...accesses: Access[]) =>
  SetMetadata('accesses', accesses);
