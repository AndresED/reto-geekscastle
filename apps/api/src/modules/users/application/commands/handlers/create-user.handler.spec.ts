import { EventBus } from '@nestjs/cqrs';
import { User } from '../../../domain/entities/user.entity';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import { UserPersistenceError } from '../../../domain/errors/user.errors';
import { PasswordHasherPort } from '../../../domain/ports/password-hasher.port';
import { UserRepositoryPort } from '../../../domain/ports/user-repository.port';
import { GeneratePasswordOnUserCreatedHandler } from '../../events/handlers/generate-password-on-user-created.handler';
import { CreateUserCommand } from '../create-user.command';
import { CreateUserHandler } from './create-user.handler';

describe('CreateUserHandler', () => {
  let users: jest.Mocked<UserRepositoryPort>;
  let hasher: jest.Mocked<PasswordHasherPort>;
  let eventBus: { publish: jest.Mock };
  let passwordOnCreated: { handle: jest.Mock };
  let handler: CreateUserHandler;

  beforeEach(() => {
    users = {
      create: jest.fn(),
      updatePassword: jest.fn(),
      findById: jest.fn(),
    };
    hasher = { hash: jest.fn() };
    eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    passwordOnCreated = { handle: jest.fn().mockResolvedValue(undefined) };
    handler = new CreateUserHandler(
      users,
      hasher,
      eventBus as unknown as EventBus,
      passwordOnCreated as unknown as GeneratePasswordOnUserCreatedHandler,
    );
  });

  it('should await password handler and return user with hasPassword when password omitted', async () => {
    const created = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'jane@example.com',
      passwordHash: null,
    });
    const withPassword = created.withPasswordHash('hash', true);
    users.create.mockResolvedValue(created);
    users.findById.mockResolvedValue(withPassword);

    const result = await handler.execute(
      new CreateUserCommand('jane', 'jane@example.com'),
    );

    expect(passwordOnCreated.handle).toHaveBeenCalledWith(
      expect.any(UserCreatedEvent),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(UserCreatedEvent));
    expect(result.passwordGenerated).toBe(true);
    expect(result.user.hasPassword).toBe(true);
    expect(result.user.passwordGenerated).toBe(true);
  });

  it('should hash provided password and publish password-missing=false', async () => {
    hasher.hash.mockResolvedValue('hashed');
    users.create.mockImplementation(async (u) => u);

    const result = await handler.execute(
      new CreateUserCommand('jane', 'jane@example.com', 'secret123'),
    );

    expect(hasher.hash).toHaveBeenCalledWith('secret123');
    expect(passwordOnCreated.handle).toHaveBeenCalledWith(
      expect.objectContaining({ passwordMissing: false }),
    );
    expect(result.passwordGenerated).toBe(false);
    expect(result.user.hasPassword).toBe(true);
  });

  it('should treat blank password as missing', async () => {
    const created = User.create({
      id: 'id-1',
      username: 'jane',
      email: 'jane@example.com',
    });
    users.create.mockResolvedValue(created);
    users.findById.mockResolvedValue(created.withPasswordHash('h', true));

    await handler.execute(
      new CreateUserCommand('jane', 'jane@example.com', '   '),
    );

    expect(hasher.hash).not.toHaveBeenCalled();
    const event = passwordOnCreated.handle.mock
      .calls[0][0] as UserCreatedEvent;
    expect(event.passwordMissing).toBe(true);
  });

  it('should fail create when password update handler rejects', async () => {
    users.create.mockImplementation(async (u) => u);
    passwordOnCreated.handle.mockRejectedValue(
      new UserPersistenceError('update failed'),
    );

    await expect(
      handler.execute(new CreateUserCommand('jane', 'jane@example.com')),
    ).rejects.toBeInstanceOf(UserPersistenceError);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
