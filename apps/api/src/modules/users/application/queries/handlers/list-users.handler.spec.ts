import { User } from '../../../domain/entities/user.entity';
import { UserRepositoryPort } from '../../../domain/ports/user-repository.port';
import { ListUsersQuery } from '../list-users.query';
import { ListUsersHandler } from './list-users.handler';

describe('ListUsersHandler', () => {
  let users: jest.Mocked<UserRepositoryPort>;
  let handler: ListUsersHandler;

  beforeEach(() => {
    users = {
      create: jest.fn(),
      updatePassword: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      listAll: jest.fn(),
      delete: jest.fn(),
    };
    handler = new ListUsersHandler(users);
  });

  it('should return all users from repository', async () => {
    const list = [
      User.create({ id: '1', username: 'a', email: 'a@example.com' }),
      User.create({ id: '2', username: 'b', email: 'b@example.com' }),
    ];
    users.listAll.mockResolvedValue(list);

    await expect(handler.execute(new ListUsersQuery())).resolves.toEqual(list);
    expect(users.listAll).toHaveBeenCalled();
  });

  it('should return empty array when no users exist', async () => {
    users.listAll.mockResolvedValue([]);

    await expect(handler.execute(new ListUsersQuery())).resolves.toEqual([]);
  });
});
