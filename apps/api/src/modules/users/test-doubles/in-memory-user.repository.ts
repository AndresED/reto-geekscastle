import { User } from '../domain/entities/user.entity';
import { UserEmailConflictError } from '../domain/errors/user.errors';
import type { UserRepositoryPort } from '../domain/ports/user-repository.port';

/** Fake `UserRepositoryPort` for unit/smoke tests (in-memory users + email claims). */
export class InMemoryUserRepository implements UserRepositoryPort {
  private readonly store = new Map<string, User>();
  private readonly emails = new Map<string, string>();

  async create(user: User): Promise<User> {
    if (this.emails.has(user.email)) {
      throw new UserEmailConflictError(user.email);
    }
    this.emails.set(user.email, user.id);
    this.store.set(user.id, user);
    return user;
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
    passwordGenerated: boolean,
  ): Promise<User> {
    const existing = this.store.get(userId);
    if (!existing) {
      throw new Error(`missing ${userId}`);
    }
    const updated = existing.withPasswordHash(passwordHash, passwordGenerated);
    this.store.set(userId, updated);
    return updated;
  }

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const userId = this.emails.get(normalized);
    if (!userId) {
      return null;
    }
    return this.store.get(userId) ?? null;
  }

  async list(limit: number): Promise<User[]> {
    return [...this.store.values()]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, Math.max(0, limit));
  }

  async delete(id: string): Promise<void> {
    const user = this.store.get(id);
    this.store.delete(id);
    if (user) {
      this.emails.delete(user.email);
    }
  }

  get size(): number {
    return this.store.size;
  }
}
