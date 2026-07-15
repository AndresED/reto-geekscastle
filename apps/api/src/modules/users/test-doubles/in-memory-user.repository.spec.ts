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

  it('should cap list results to the requested limit', async () => {
    const repo = new InMemoryUserRepository();
    const t0 = new Date('2026-07-15T00:00:00.000Z');
    for (let i = 0; i < 5; i++) {
      await repo.create(
        User.create({
          id: `id-${i}`,
          username: `u${i}`,
          email: `u${i}@example.com`,
          createdAt: new Date(t0.getTime() + i * 1000),
          updatedAt: new Date(t0.getTime() + i * 1000),
        }),
      );
    }

    const page = await repo.list(3);
    expect(page).toHaveLength(3);
    expect(page.map((u) => u.id)).toEqual(['id-0', 'id-1', 'id-2']);
  });
});
