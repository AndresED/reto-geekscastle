import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Domain/application errors mapped by `HttpExceptionFilter`. */
export class DomainApiErrorDto {
  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({
    example: 'NOT_FOUND',
    description: 'Stable application error code',
    enum: [
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'CONFLICT',
      'PERSISTENCE_ERROR',
      'INTERNAL_ERROR',
    ],
  })
  code!: string;

  @ApiProperty({
    example: 'User not found: u1',
    description: 'Human-readable error message (no secrets)',
  })
  message!: string;
}

/** Nest `ValidationPipe` / `HttpException` body for bad input. */
export class ValidationApiErrorDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Bad Request' },
      {
        type: 'array',
        items: { type: 'string' },
        example: [
          'email must be an email',
          'username must be shorter than or equal to 64 characters',
        ],
      },
    ],
    description: 'Validation message(s) from class-validator',
  })
  message!: string | string[];

  @ApiPropertyOptional({ example: 'Bad Request' })
  error?: string;
}

/** `@nestjs/throttler` when `POST /users` exceeds 20 req/min. */
export class ThrottleApiErrorDto {
  @ApiProperty({ example: 429 })
  statusCode!: number;

  @ApiProperty({
    example: 'ThrottlerException: Too Many Requests',
  })
  message!: string;
}
