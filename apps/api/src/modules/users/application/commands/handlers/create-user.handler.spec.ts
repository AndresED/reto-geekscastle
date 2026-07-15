import { EventBus } from '@nestjs/cqrs';
import { User } from '../../../domain/entities/user.entity';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import { PasswordHasherPort } from '../../../domain/ports/password-hasher.port';
import { UserRepositoryPort } from '../../../domain/ports/user-repository.port';
import { CreateUserCommand } from '../create-user.command';
import { CreateUserHandler } from './create-user.handler';

describe('CreateUserHandler', () => {
  let users: jest.Mocked<UserRepositoryPort>;
  let hasher: jest.Mocked<PasswordHasherPort>;
  let eventBus: { publish: jest.Mock };
  let handler: CreateUserHandler;

  beforeEach(() => {
    users = {
      create: jest.fn(),
      updatePassword: jest.fn(),
      findById: jest.fn(),
    };
    hasher = { hash: jest.fn() };
    eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    handler = new CreateUserHandler(
      users,
      hasher,
      eventBus as unknown as EventBus,
    );
  });

  it('should create user and publish password-missing event when password omitted', async () => {
    users.create.mockImplementation(async (u) => u);

    const result = await handler.execute(
      new CreateUserCommand('jane', 'jane@example.com'),
    );

    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'jane',
        email: 'jane@example.com',
        passwordHash: null,
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(UserCreatedEvent),
    );
    const event = eventBus.publish.mock.calls[0][0] as UserCreatedEvent;
    expect(event.passwordMissing).toBe(true);
    expect(result.passwordGenerated).toBe(true);
    expect(result.user.id).toBeDefined();
  });

  it('should hash provided password and publish password-missing=false', async () => {
    hasher.hash.mockResolvedValue('hashed');
    users.create.mockImplementation(async (u) => u);

    const result = await handler.execute(
      new CreateUserCommand('jane', 'jane@example.com', 'secret123'),
    );

    expect(hasher.hash).toHaveBeenCalledWith('secret123');
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed' }),
    );
    const event = eventBus.publish.mock.calls[0][0] as UserCreatedEvent;
    expect(event.passwordMissing).toBe(false);
    expect(result.passwordGenerated).toBe(false);
  });

  it('should treat blank password as missing', async () => {
    users.create.mockImplementation(async (u: User) => u);

    await handler.execute(
      new CreateUserCommand('jane', 'jane@example.com', '   '),
    );

    expect(hasher.hash).not.toHaveBeenCalled();
    const event = eventBus.publish.mock.calls[0][0] as UserCreatedEvent;
    expect(event.passwordMissing).toBe(true);
  });
});
