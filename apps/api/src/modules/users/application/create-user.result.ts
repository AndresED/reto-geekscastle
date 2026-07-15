import { User } from '../domain/entities/user.entity';

export type CreateUserResult = {
  user: User;
  passwordGenerated: boolean;
};
