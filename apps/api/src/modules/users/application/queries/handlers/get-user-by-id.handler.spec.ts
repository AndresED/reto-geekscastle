import { User } from '../../../domain/entities/user.entity';
import { UserNotFoundError } from '../../../domain/errors/user.errors';
import { UserRepositoryPort } from '../../../domain/ports/user-repository.port';
import { GetUserByIdQuery } from '../get-user-by-id.query';
import { GetUserByIdHandler } from './get-user-by-id.handler';

describe('GetUserByIdHandler', () => {
  let users: jest.Mocked<UserRepositoryPort>;
  let handler: GetUserByIdHandler;

  beforeEach(() => {
    users = {
      create: jest.fn(),
      updatePassword: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      listAll: jest.fn(),
      delete: jest.fn(),
    };
    handler = new GetUserByIdHandler(users);
  });

  it('should return user when found', async () => {
    const user = User.create({
      id: '1',
      username: 'jane',
      email: 'jane@example.com',
    });
    users.findById.mockResolvedValue(user);

    await expect(handler.execute(new GetUserByIdQuery('1'))).resolves.toBe(
      user,
    );
  });

  it('should throw UserNotFoundError when missing', async () => {
    users.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new GetUserByIdQuery('missing')),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
