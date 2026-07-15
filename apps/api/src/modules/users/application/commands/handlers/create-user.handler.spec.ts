import { EventBus } from '@nestjs/cqrs';
import { User } from '../../../domain/entities/user.entity';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import {
  UserEmailConflictError,
  UserPersistenceError,
} from '../../../domain/errors/user.errors';
import { PasswordHasherPort } from '../../../domain/ports/password-hasher.port';
import { UserRepositoryPort } from '../../../domain/ports/user-repository.port';
import { FinalizeMissingPasswordService } from '../../services/finalize-missing-password.service';
import { CreateUserCommand } from '../create-user.command';
import { CreateUserHandler } from './create-user.handler';

describe('CreateUserHandler', () => {
  let users: jest.Mocked<UserRepositoryPort>;
  let hasher: jest.Mocked<PasswordHasherPort>;
  let eventBus: { publish: jest.Mock };
  let finalize: { execute: jest.Mock };
  let handler: CreateUserHandler;

  beforeEach(() => {
    users = {
      create: jest.fn(),
      updatePassword: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
      listAll: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    hasher = { hash: jest.fn() };
    eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    finalize = { execute: jest.fn().mockResolvedValue(undefined) };
    handler = new CreateUserHandler(
      users,
      hasher,
      eventBus as unknown as EventBus,
      finalize as unknown as FinalizeMissingPasswordService,
    );
  });

  it('should await finalize and return user with hasPassword when password omitted', async () => {
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

    expect(finalize.execute).toHaveBeenCalledWith(created.id);
    expect(finalize.execute).toHaveBeenCalledTimes(1);
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(UserCreatedEvent));
    expect(result.passwordGenerated).toBe(true);
    expect(result.user.hasPassword).toBe(true);
  });

  it('should hash provided password only after uniqueness check passes', async () => {
    hasher.hash.mockResolvedValue('hashed');
    users.create.mockImplementation(async (u) => u);

    const result = await handler.execute(
      new CreateUserCommand('jane', 'jane@example.com', 'secret123'),
    );

    expect(users.findByEmail).toHaveBeenCalled();
    expect(hasher.hash).toHaveBeenCalledWith('secret123');
    expect(finalize.execute).not.toHaveBeenCalled();
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
    expect(finalize.execute).toHaveBeenCalled();
  });

  it('should fail create when finalize rejects', async () => {
    users.create.mockImplementation(async (u) => u);
    finalize.execute.mockRejectedValue(
      new UserPersistenceError('update failed'),
    );

    await expect(
      handler.execute(new CreateUserCommand('jane', 'jane@example.com')),
    ).rejects.toBeInstanceOf(UserPersistenceError);

    expect(users.delete).toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should reject duplicate email without hashing or creating', async () => {
    users.findByEmail.mockResolvedValue(
      User.create({
        id: 'existing',
        username: 'other',
        email: 'jane@example.com',
      }),
    );

    await expect(
      handler.execute(
        new CreateUserCommand('jane', 'Jane@Example.com', 'secret123'),
      ),
    ).rejects.toBeInstanceOf(UserEmailConflictError);

    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.create).not.toHaveBeenCalled();
  });
});
