import { User } from '../../domain/entities/user.entity';
import { PasswordGeneratorPort } from '../../domain/ports/password-generator.port';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { FinalizeMissingPasswordService } from './finalize-missing-password.service';

describe('FinalizeMissingPasswordService', () => {
  let users: jest.Mocked<UserRepositoryPort>;
  let generator: jest.Mocked<PasswordGeneratorPort>;
  let hasher: jest.Mocked<PasswordHasherPort>;
  let service: FinalizeMissingPasswordService;

  beforeEach(() => {
    users = {
      create: jest.fn(),
      updatePassword: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      listAll: jest.fn(),
      delete: jest.fn(),
    };
    generator = { generate: jest.fn() };
    hasher = { hash: jest.fn() };
    service = new FinalizeMissingPasswordService(users, generator, hasher);
  });

  it('should generate hash and update when user has no password', async () => {
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

    await service.execute('user-1');

    expect(generator.generate).toHaveBeenCalled();
    expect(hasher.hash).toHaveBeenCalledWith('GeneratedPass1!');
    expect(users.updatePassword).toHaveBeenCalledWith(
      'user-1',
      'hash-value',
      true,
    );
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

    await service.execute('user-1');

    expect(generator.generate).not.toHaveBeenCalled();
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.updatePassword).not.toHaveBeenCalled();
  });
});
