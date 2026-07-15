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

  it('should generate hash and update when password missing', async () => {
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

  it('should no-op when password already present', async () => {
    await handler.handle(new UserCreatedEvent('user-1', false));

    expect(generator.generate).not.toHaveBeenCalled();
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.updatePassword).not.toHaveBeenCalled();
  });
});
