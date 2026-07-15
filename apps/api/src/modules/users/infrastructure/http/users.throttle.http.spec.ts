import { ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { CreateUserHandler } from '../../application/commands/handlers/create-user.handler';
import { FinalizeMissingPasswordService } from '../../application/services/finalize-missing-password.service';
import { GetUserByIdHandler } from '../../application/queries/handlers/get-user-by-id.handler';
import { ListUsersHandler } from '../../application/queries/handlers/list-users.handler';
import {
  PASSWORD_GENERATOR_PORT,
  type PasswordGeneratorPort,
} from '../../domain/ports/password-generator.port';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../domain/ports/password-hasher.port';
import { USER_REPOSITORY_PORT } from '../../domain/ports/user-repository.port';
import { InMemoryUserRepository } from '../../test-doubles/in-memory-user.repository';
import { HealthController } from '../../../../shared/health/health.controller';
import { API_THROTTLE } from '../../../../shared/config/throttle.constants';
import { UsersController } from './users.controller';

describe('Users API throttle (HTTP)', () => {
  let app: App;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        CqrsModule,
        // Faster assertion than production limit; values for ttl/name stay aligned.
        ThrottlerModule.forRoot([
          {
            name: API_THROTTLE.name,
            ttl: API_THROTTLE.ttl,
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
        ListUsersHandler,
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
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should export production throttle limit constant', () => {
    expect(API_THROTTLE.limit).toBe(20);
    expect(API_THROTTLE.ttl).toBe(60_000);
  });

  it('should return 429 on excess create and keep health available', async () => {
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

  it('should also throttle GET /users after the shared limit is exhausted', async () => {
    // Shared in-memory tracker may already be near limit from prior test.
    // Blow remaining budget with GETs until blocked, then prove health still works.
    let lastStatus = 200;
    for (let i = 0; i < 5; i++) {
      lastStatus = (await request(app).get('/api/v1/users')).status;
      if (lastStatus === 429) {
        break;
      }
    }
    expect(lastStatus).toBe(429);

    const health = await request(app).get('/api/v1/health');
    expect(health.status).toBe(200);
  });
});
