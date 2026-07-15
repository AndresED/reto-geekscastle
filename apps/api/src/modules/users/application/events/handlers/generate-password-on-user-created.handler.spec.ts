import { User } from '../../../domain/entities/user.entity';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import { PasswordGeneratorPort } from '../../../domain/ports/password-generator.port';
import { PasswordHasherPort } from '../../../domain/ports/password-hasher.port';
import { UserRepositoryPort } from '../../../domain/ports/user-repository.port';
import { GeneratePasswordOnUserCreatedHandler } from './generate-password-on-user-created.handler';

describe('GeneratePasswordOnUserCreatedHandler', () => {
  let users: jest.Mocked<UserRepositoryPort>;
  let generator: jest.Mocked<PasswordGeneratorPort>;
  let hasher: jest.Mocked<PasswordHasherPort>;
  let handler: GeneratePasswordOnUserCreatedHandler;

  beforeEach(() => {
    users = {
      create: jest.fn(),
      updatePassword: jest.fn(),
      findById: jest.fn(),
    };
    generator = { generate: jest.fn() };
    hasher = { hash: jest.fn() };
    handler = new GeneratePasswordOnUserCreatedHandler(
      users,
      generator,
      hasher,
    );
  });

  it('should generate hash and update when password missing and user has none', async () => {
    users.findById.mockResolvedValue(
      User.create({
        id: 'user-1',
        username: 'jane',
        email: 'jane@example.com',
        passwordHash: null,
      }),
    );
    generator.generate.mockReturnValue('GeneratedPass1!');
    hasher.hash.mockResolvedValue('hash-value');
    users.updatePassword.mockResolvedValue({} as never);

    await handler.handle(new UserCreatedEvent('user-1', true));

    expect(generator.generate).toHaveBeenCalled();
    expect(hasher.hash).toHaveBeenCalledWith('GeneratedPass1!');
    expect(users.updatePassword).toHaveBeenCalledWith(
      'user-1',
      'hash-value',
      true,
    );
  });

  it('should no-op when passwordMissing is false', async () => {
    await handler.handle(new UserCreatedEvent('user-1', false));

    expect(users.findById).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
    expect(users.updatePassword).not.toHaveBeenCalled();
  });

  it('should no-op when user already has password hash (replay)', async () => {
    users.findById.mockResolvedValue(
      User.create({
        id: 'user-1',
        username: 'jane',
        email: 'jane@example.com',
        passwordHash: 'existing',
        passwordGenerated: true,
      }),
    );

    await handler.handle(new UserCreatedEvent('user-1', true));

    expect(generator.generate).not.toHaveBeenCalled();
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.updatePassword).not.toHaveBeenCalled();
  });
});
