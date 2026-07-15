import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { User } from '../../domain/entities/user.entity';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    controller = new UsersController(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  it('should dispatch CreateUserCommand and map response without secrets', async () => {
    const user = User.create({
      id: 'u1',
      username: 'jane',
      email: 'jane@example.com',
      passwordHash: 'secret-hash',
    });
    commandBus.execute.mockResolvedValue({
      user,
      passwordGenerated: true,
    });

    const response = await controller.create({
      username: 'jane',
      email: 'jane@example.com',
    });

    expect(commandBus.execute).toHaveBeenCalled();
    expect(response).toMatchObject({
      id: 'u1',
      username: 'jane',
      email: 'jane@example.com',
      passwordGenerated: true,
    });
    expect(response).not.toHaveProperty('passwordHash');
    expect(response).not.toHaveProperty('password');
  });

  it('should dispatch GetUserByIdQuery', async () => {
    const user = User.create({
      id: 'u1',
      username: 'jane',
      email: 'jane@example.com',
      passwordHash: 'h',
      passwordGenerated: true,
    });
    queryBus.execute.mockResolvedValue(user);

    const response = await controller.getById('u1');

    expect(queryBus.execute).toHaveBeenCalled();
    expect(response.hasPassword).toBe(true);
    expect(response).not.toHaveProperty('passwordHash');
  });
});
