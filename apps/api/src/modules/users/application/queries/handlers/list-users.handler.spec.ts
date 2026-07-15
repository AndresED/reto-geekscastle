import { USERS_LIST_MAX } from '../../../../../shared/config/users-list.constants';
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
      list: jest.fn(),
      delete: jest.fn(),
    };
    handler = new ListUsersHandler(users);
  });

  it('should return users from repository with server cap', async () => {
    const list = [
      User.create({ id: '1', username: 'a', email: 'a@example.com' }),
      User.create({ id: '2', username: 'b', email: 'b@example.com' }),
    ];
    users.list.mockResolvedValue(list);

    await expect(handler.execute(new ListUsersQuery())).resolves.toEqual(list);
    expect(users.list).toHaveBeenCalledWith(USERS_LIST_MAX);
  });

  it('should return empty array when no users exist', async () => {
    users.list.mockResolvedValue([]);

    await expect(handler.execute(new ListUsersQuery())).resolves.toEqual([]);
  });
});
