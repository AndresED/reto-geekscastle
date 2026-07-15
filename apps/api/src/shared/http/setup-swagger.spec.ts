import { INestApplication } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { UsersController } from '../../modules/users/infrastructure/http/users.controller';
import { HealthController } from '../health/health.controller';
import { buildOpenApiDocument } from './setup-swagger';

describe('buildOpenApiDocument', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController, HealthController],
      providers: [
        { provide: CommandBus, useValue: { execute: jest.fn() } },
        { provide: QueryBus, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should document users success and error response schemas', () => {
    const document = buildOpenApiDocument(app);

    expect(document.paths['/api/v1/users']?.post).toBeDefined();
    expect(document.paths['/api/v1/users/{id}']?.get).toBeDefined();
    expect(document.paths['/api/v1/health']?.get).toBeDefined();

    const create = document.paths['/api/v1/users']!.post!;
    expect(create.responses?.['201']).toBeDefined();
    expect(create.responses?.['400']).toBeDefined();
    expect(create.responses?.['409']).toBeDefined();
    expect(create.responses?.['429']).toBeDefined();

    const schemas = document.components?.schemas ?? {};
    expect(schemas.UserResponseDto).toBeDefined();
    expect(schemas.CreateUserDto).toBeDefined();
    expect(schemas.DomainApiErrorDto).toBeDefined();
    expect(schemas.ValidationApiErrorDto).toBeDefined();
    expect(schemas.ThrottleApiErrorDto).toBeDefined();

    const userSchema = schemas.UserResponseDto as {
      properties?: Record<string, unknown>;
    };
    expect(userSchema.properties).not.toHaveProperty('password');
    expect(userSchema.properties).not.toHaveProperty('passwordHash');
  });
});
