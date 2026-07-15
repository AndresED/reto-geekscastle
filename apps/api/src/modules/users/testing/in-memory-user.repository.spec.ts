import { User } from '../domain/entities/user.entity';
import { UserEmailConflictError } from '../domain/errors/user.errors';
import { InMemoryUserRepository } from './in-memory-user.repository';

describe('InMemoryUserRepository', () => {
  it('should reject concurrent-style second create for same email', async () => {
    const repo = new InMemoryUserRepository();
    const a = User.create({
      id: 'a',
      username: 'a',
      email: 'same@example.com',
    });
    const b = User.create({
      id: 'b',
      username: 'b',
      email: 'same@example.com',
    });

    await repo.create(a);
    await expect(repo.create(b)).rejects.toBeInstanceOf(UserEmailConflictError);
    expect(repo.size).toBe(1);
  });
});
