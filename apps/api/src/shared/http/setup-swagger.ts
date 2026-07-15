import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Reto GeeksCastle — Users API')
    .setDescription(
      [
        'NestJS hexagonal + CQRS Users API backed by Firebase Firestore.',
        '',
        '**Auth:** none for this challenge demo (Admin SDK / emulator).',
        '',
        '**Security notes:**',
        '- Responses never include `password` or `passwordHash`.',
        '- Users routes (`POST` / `GET` list / `GET` by id) share **20 requests / minute** per IP; `/health` is exempt.',
        '- Email uniqueness is enforced (HTTP **409** on conflict).',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addTag('health', 'Liveness probe')
    .addTag('users', 'User create and read')
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Users API — OpenAPI',
    jsonDocumentUrl: 'api/docs-json',
    yamlDocumentUrl: 'api/docs-yaml',
  });
}
