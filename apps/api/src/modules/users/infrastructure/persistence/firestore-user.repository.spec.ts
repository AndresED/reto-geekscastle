import { Firestore } from 'firebase-admin/firestore';
import { User } from '../../domain/entities/user.entity';
import {
  UserEmailConflictError,
  UserPersistenceError,
} from '../../domain/errors/user.errors';
import { FirestoreUserRepository } from './firestore-user.repository';

describe('FirestoreUserRepository', () => {
  const update = jest.fn();
  const get = jest.fn();
  const batchDelete = jest.fn();
  const batchCommit = jest.fn();
  const batch = jest.fn(() => ({
    delete: batchDelete,
    commit: batchCommit,
  }));
  const runTransaction = jest.fn();

  const emailDoc = { get, delete: jest.fn() };
  const userDoc = { set: jest.fn(), update, get, delete: jest.fn() };

  const collection = jest.fn((name: string) => {
    if (name === 'emails') {
      return { doc: () => emailDoc };
    }
    return { doc: () => userDoc };
  });

  const db = { collection, batch, runTransaction } as unknown as Firestore;
  let repo: FirestoreUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    collection.mockImplementation((name: string) => {
      if (name === 'emails') {
        return { doc: () => emailDoc };
      }
      return { doc: () => userDoc };
    });
    batch.mockReturnValue({ delete: batchDelete, commit: batchCommit });
    repo = new FirestoreUserRepository(db);
  });

  it('should write email claim and user in one transaction', async () => {
    const txSet = jest.fn();
    const txGet = jest.fn().mockResolvedValue({ exists: false });
    runTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet });
    });

    const user = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'Jane@Example.com',
    });

    const created = await repo.create(user);

    expect(runTransaction).toHaveBeenCalled();
    expect(txGet).toHaveBeenCalled();
    expect(txSet).toHaveBeenCalledTimes(2);
    expect(created.id).toBe('id-1');
  });

  it('should map existing claim in transaction to UserEmailConflictError', async () => {
    runTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        get: jest.fn().mockResolvedValue({ exists: true }),
        set: jest.fn(),
      });
    });

    const user = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'jane@example.com',
    });

    await expect(repo.create(user)).rejects.toBeInstanceOf(
      UserEmailConflictError,
    );
  });

  it('should wrap non-conflict transaction failures as UserPersistenceError', async () => {
    runTransaction.mockRejectedValue(new Error('offline'));
    const user = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'jane@example.com',
    });

    await expect(repo.create(user)).rejects.toBeInstanceOf(
      UserPersistenceError,
    );
  });

  it('should find by email via claim doc', async () => {
    get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: 'id-1', createdAt: '2026-07-15T00:00:00.000Z' }),
      })
      .mockResolvedValueOnce({
        exists: true,
        id: 'id-1',
        data: () => ({
          username: 'jane',
          email: 'jane@example.com',
          passwordHash: 'h',
          passwordGenerated: true,
          createdAt: '2026-07-15T00:00:00.000Z',
          updatedAt: '2026-07-15T00:00:00.000Z',
        }),
      });

    const user = await repo.findByEmail('Jane@Example.com');
    expect(user?.id).toBe('id-1');
    expect(user?.hasPassword).toBe(true);
  });

  it('should return null when claim missing', async () => {
    get.mockResolvedValue({ exists: false });
    await expect(repo.findByEmail('missing@example.com')).resolves.toBeNull();
  });

  it('should update password hash on existing user', async () => {
    get.mockResolvedValue({
      exists: true,
      data: () => ({
        username: 'jane',
        email: 'jane@example.com',
        passwordHash: null,
        passwordGenerated: false,
        createdAt: '2026-07-15T00:00:00.000Z',
        updatedAt: '2026-07-15T00:00:00.000Z',
      }),
    });
    update.mockResolvedValue(undefined);

    const updated = await repo.updatePassword('id-1', 'new-hash', true);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: 'new-hash',
        passwordGenerated: true,
      }),
    );
    expect(updated.passwordHash).toBe('new-hash');
  });

  it('should delete user and email claim', async () => {
    get.mockResolvedValue({
      exists: true,
      id: 'id-1',
      data: () => ({
        username: 'jane',
        email: 'jane@example.com',
        passwordHash: null,
        passwordGenerated: false,
        createdAt: '2026-07-15T00:00:00.000Z',
        updatedAt: '2026-07-15T00:00:00.000Z',
      }),
    });
    batchCommit.mockResolvedValue(undefined);

    await repo.delete('id-1');

    expect(batchDelete).toHaveBeenCalled();
    expect(batchCommit).toHaveBeenCalled();
  });
});
