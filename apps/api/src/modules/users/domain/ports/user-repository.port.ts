import { User } from '../entities/user.entity';

export const USER_REPOSITORY_PORT = Symbol('USER_REPOSITORY_PORT');

export interface UserRepositoryPort {
  create(user: User): Promise<User>;
  updatePassword(
    userId: string,
    passwordHash: string,
    passwordGenerated: boolean,
  ): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  delete(id: string): Promise<void>;
}
