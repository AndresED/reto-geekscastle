import { Firestore } from 'firebase-admin/firestore';
import { User } from '../../domain/entities/user.entity';
import {
  UserEmailConflictError,
  UserPersistenceError,
} from '../../domain/errors/user.errors';
import { FirestoreUserRepository } from './firestore-user.repository';

describe('FirestoreUserRepository', () => {
  const set = jest.fn();
  const update = jest.fn();
  const get = jest.fn();
  const del = jest.fn();
  const create = jest.fn();
  const batchDelete = jest.fn();
  const batchCommit = jest.fn();
  const batch = jest.fn(() => ({
    delete: batchDelete,
    commit: batchCommit,
  }));

  const emailDoc = { create, get, delete: del };
  const userDoc = { set, update, get, delete: del };

  const doc = jest.fn((id: string) => {
    // heuristic: uuid-like or id-1 → user; emails → email claim docs
    return id.includes('@') || id === 'jane@example.com' ? emailDoc : userDoc;
  });

  const collection = jest.fn((name: string) => {
    if (name === 'emails') {
      return {
        doc: (email: string) => {
          void email;
          return emailDoc;
        },
      };
    }
    return {
      doc: (id: string) => {
        void id;
        return userDoc;
      },
    };
  });

  const db = { collection, batch } as unknown as Firestore;
  let repo: FirestoreUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    collection.mockImplementation((name: string) => {
      if (name === 'emails') {
        return {
          doc: () => emailDoc,
        };
      }
      return {
        doc: () => userDoc,
      };
    });
    batch.mockReturnValue({ delete: batchDelete, commit: batchCommit });
    repo = new FirestoreUserRepository(db);
  });

  it('should claim email then persist user on create', async () => {
    create.mockResolvedValue(undefined);
    set.mockResolvedValue(undefined);
    const user = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'Jane@Example.com',
    });

    const created = await repo.create(user);

    expect(collection).toHaveBeenCalledWith('emails');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'id-1' }),
    );
    expect(collection).toHaveBeenCalledWith('users');
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'jane',
        email: 'jane@example.com',
        passwordHash: null,
      }),
    );
    expect(created.id).toBe('id-1');
  });

  it('should map email claim ALREADY_EXISTS to UserEmailConflictError', async () => {
    create.mockRejectedValue({ code: 6, message: 'ALREADY_EXISTS' });
    const user = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'jane@example.com',
    });

    await expect(repo.create(user)).rejects.toBeInstanceOf(
      UserEmailConflictError,
    );
    expect(set).not.toHaveBeenCalled();
  });

  it('should release email claim when user set fails', async () => {
    create.mockResolvedValue(undefined);
    set.mockRejectedValue(new Error('offline'));
    del.mockResolvedValue(undefined);
    const user = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'jane@example.com',
    });

    await expect(repo.create(user)).rejects.toBeInstanceOf(
      UserPersistenceError,
    );
    expect(del).toHaveBeenCalled();
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
