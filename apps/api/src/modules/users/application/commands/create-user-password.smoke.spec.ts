import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../../domain/entities/user.entity';
import {
  PASSWORD_GENERATOR_PORT,
  type PasswordGeneratorPort,
} from '../../domain/ports/password-generator.port';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import { BcryptPasswordHasher } from '../../infrastructure/crypto/bcrypt-password.hasher';
import { CryptoPasswordGenerator } from '../../infrastructure/crypto/crypto-password.generator';
import { FinalizeMissingPasswordService } from '../services/finalize-missing-password.service';
import { InMemoryUserRepository } from '../../test-doubles/in-memory-user.repository';
import { CreateUserCommand } from './create-user.command';
import { CreateUserHandler } from './handlers/create-user.handler';
import { CreateUserResult } from './create-user.result';

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
        FinalizeMissingPasswordService,
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

  it('should fail create when password update rejects and leave no orphan', async () => {
    const store = new Map<string, User>();
    const emails = new Map<string, string>();
    const failingRepo: UserRepositoryPort = {
      create: async (user) => {
        emails.set(user.email, user.id);
        store.set(user.id, user);
        return user;
      },
      updatePassword: async () => {
        throw new Error('forced update failure');
      },
      findById: async (id) => store.get(id) ?? null,
      findByEmail: async (email) => {
        const id = emails.get(email.trim().toLowerCase());
        return id ? (store.get(id) ?? null) : null;
      },
      listAll: async () => [...store.values()],
      delete: async (id) => {
        const user = store.get(id);
        store.delete(id);
        if (user) {
          emails.delete(user.email);
        }
      },
    };

    const local = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        CreateUserHandler,
        FinalizeMissingPasswordService,
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

    expect(store.size).toBe(0);
    expect(emails.size).toBe(0);

    await local.close();
  });
});
