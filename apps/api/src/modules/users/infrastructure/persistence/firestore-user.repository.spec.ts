import { Firestore } from 'firebase-admin/firestore';
import { User } from '../../domain/entities/user.entity';
import { UserPersistenceError } from '../../domain/errors/user.errors';
import { FirestoreUserRepository } from './firestore-user.repository';

describe('FirestoreUserRepository', () => {
  const set = jest.fn();
  const update = jest.fn();
  const get = jest.fn();
  const del = jest.fn();
  const whereGet = jest.fn();
  const limit = jest.fn(() => ({ get: whereGet }));
  const where = jest.fn(() => ({ limit }));
  const doc = jest.fn(() => ({ set, update, get, delete: del }));
  const collection = jest.fn(() => ({ doc, where }));
  const db = { collection } as unknown as Firestore;

  let repo: FirestoreUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    doc.mockReturnValue({ set, update, get, delete: del });
    limit.mockReturnValue({ get: whereGet });
    where.mockReturnValue({ limit });
    collection.mockReturnValue({ doc, where });
    repo = new FirestoreUserRepository(db);
  });

  it('should persist user document on create', async () => {
    set.mockResolvedValue(undefined);
    const user = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'Jane@Example.com',
    });

    const created = await repo.create(user);

    expect(collection).toHaveBeenCalledWith('users');
    expect(doc).toHaveBeenCalledWith('id-1');
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'jane',
        email: 'jane@example.com',
        passwordHash: null,
      }),
    );
    expect(created.id).toBe('id-1');
  });

  it('should throw UserPersistenceError when create fails', async () => {
    set.mockRejectedValue(new Error('offline'));
    const user = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'jane@example.com',
    });

    await expect(repo.create(user)).rejects.toBeInstanceOf(
      UserPersistenceError,
    );
  });

  it('should map findById document to domain user', async () => {
    get.mockResolvedValue({
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

    const user = await repo.findById('id-1');

    expect(user?.hasPassword).toBe(true);
    expect(user?.passwordGenerated).toBe(true);
  });

  it('should return null when document missing', async () => {
    get.mockResolvedValue({ exists: false });
    await expect(repo.findById('missing')).resolves.toBeNull();
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

  it('should delete user document', async () => {
    del.mockResolvedValue(undefined);
    await repo.delete('id-1');
    expect(doc).toHaveBeenCalledWith('id-1');
    expect(del).toHaveBeenCalled();
  });

  it('should find user by normalized email', async () => {
    whereGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'id-1',
          data: () => ({
            username: 'jane',
            email: 'jane@example.com',
            passwordHash: null,
            passwordGenerated: false,
            createdAt: '2026-07-15T00:00:00.000Z',
            updatedAt: '2026-07-15T00:00:00.000Z',
          }),
        },
      ],
    });

    const user = await repo.findByEmail('Jane@Example.com');

    expect(where).toHaveBeenCalledWith('email', '==', 'jane@example.com');
    expect(user?.id).toBe('id-1');
  });
});
