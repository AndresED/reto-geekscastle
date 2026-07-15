import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../domain/entities/user.entity';
import {
  PASSWORD_GENERATOR_PORT,
  type PasswordGeneratorPort,
} from '../domain/ports/password-generator.port';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from '../domain/ports/user-repository.port';
import { BcryptPasswordHasher } from '../infrastructure/crypto/bcrypt-password.hasher';
import { CryptoPasswordGenerator } from '../infrastructure/crypto/crypto-password.generator';
import { CreateUserCommand } from './commands/create-user.command';
import {
  CreateUserHandler,
  CreateUserResult,
} from './commands/handlers/create-user.handler';
import { GeneratePasswordOnUserCreatedHandler } from './events/handlers/generate-password-on-user-created.handler';

class InMemoryUserRepository implements UserRepositoryPort {
  private readonly store = new Map<string, User>();

  async create(user: User): Promise<User> {
    this.store.set(user.id, user);
    return user;
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
    passwordGenerated: boolean,
  ): Promise<User> {
    const existing = this.store.get(userId);
    if (!existing) {
      throw new Error(`missing ${userId}`);
    }
    const updated = existing.withPasswordHash(passwordHash, passwordGenerated);
    this.store.set(userId, updated);
    return updated;
  }

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }
}

describe('Create user password smoke', () => {
  let moduleRef: TestingModule;
  let commandBus: CommandBus;
  let repo: InMemoryUserRepository;

  beforeAll(async () => {
    repo = new InMemoryUserRepository();

    moduleRef = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        CreateUserHandler,
        GeneratePasswordOnUserCreatedHandler,
        {
          provide: USER_REPOSITORY_PORT,
          useValue: repo,
        },
        {
          provide: PASSWORD_GENERATOR_PORT,
          useClass: CryptoPasswordGenerator,
        },
        {
          provide: PASSWORD_HASHER_PORT,
          useClass: BcryptPasswordHasher,
        },
      ],
    }).compile();

    await moduleRef.init();
    commandBus = moduleRef.get(CommandBus);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should persist password hash after create without password', async () => {
    const result = await commandBus.execute<CreateUserCommand, CreateUserResult>(
      new CreateUserCommand('smoke-user', 'smoke@example.com'),
    );

    expect(result.passwordGenerated).toBe(true);
    expect(result.user.hasPassword).toBe(true);
    expect(result.user.passwordHash).toBeTruthy();

    const stored = await repo.findById(result.user.id);
    expect(stored?.hasPassword).toBe(true);
    expect(stored?.passwordHash).toMatch(/^\$2[aby]?\$/);
  });

  it('should fail create when password update rejects', async () => {
    const failingRepo: UserRepositoryPort = {
      create: async (user) => user,
      updatePassword: async () => {
        throw new Error('forced update failure');
      },
      findById: async (id) =>
        User.create({
          id,
          username: 'x',
          email: 'x@example.com',
          passwordHash: null,
        }),
    };

    const local = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        CreateUserHandler,
        GeneratePasswordOnUserCreatedHandler,
        { provide: USER_REPOSITORY_PORT, useValue: failingRepo },
        {
          provide: PASSWORD_GENERATOR_PORT,
          useValue: {
            generate: () => 'GeneratedPass16!!',
          } satisfies PasswordGeneratorPort,
        },
        {
          provide: PASSWORD_HASHER_PORT,
          useValue: {
            hash: async (p) => `hash:${p}`,
          } satisfies PasswordHasherPort,
        },
      ],
    }).compile();

    await local.init();
    const bus = local.get(CommandBus);

    await expect(
      bus.execute(new CreateUserCommand('fail', 'fail@example.com')),
    ).rejects.toThrow('forced update failure');

    await local.close();
  });
});
