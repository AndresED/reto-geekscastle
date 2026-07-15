import { ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { CreateUserHandler } from '../../application/commands/handlers/create-user.handler';
import { FinalizeMissingPasswordService } from '../../application/finalize-missing-password.service';
import { GetUserByIdHandler } from '../../application/queries/handlers/get-user-by-id.handler';
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
import { HealthController } from '../../../../shared/health/health.controller';
import { UsersController } from './users.controller';

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

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.store.values()) {
      if (user.email === normalized) {
        return user;
      }
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

describe('Users create throttle (HTTP)', () => {
  let app: App;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        CqrsModule,
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60_000,
            limit: 2,
          },
        ]),
      ],
      controllers: [UsersController, HealthController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        CreateUserHandler,
        FinalizeMissingPasswordService,
        GetUserByIdHandler,
        {
          provide: USER_REPOSITORY_PORT,
          useClass: InMemoryUserRepository,
        },
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

    const nestApp = moduleRef.createNestApplication();
    nestApp.setGlobalPrefix('api/v1');
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await nestApp.init();
    app = nestApp.getHttpServer();

    // Ensure CQRS handlers are discovered
    void moduleRef.get(CommandBus);
    void moduleRef.get(QueryBus);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should return 429 after create limit and keep health available', async () => {
    const first = await request(app)
      .post('/api/v1/users')
      .send({ username: 'u1', email: 'u1@example.com', password: 'secret123' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/users')
      .send({ username: 'u2', email: 'u2@example.com', password: 'secret123' });
    expect(second.status).toBe(201);

    const blocked = await request(app)
      .post('/api/v1/users')
      .send({ username: 'u3', email: 'u3@example.com', password: 'secret123' });
    expect(blocked.status).toBe(429);

    const health = await request(app).get('/api/v1/health');
    expect(health.status).toBe(200);
  });
});
