import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CreateUserCommand } from '../../application/commands/create-user.command';
import { CreateUserResult } from '../../application/commands/create-user.result';
import { GetUserByIdQuery } from '../../application/queries/get-user-by-id.query';
import { User } from '../../domain/entities/user.entity';
import {
  DomainApiErrorDto,
  ThrottleApiErrorDto,
  ValidationApiErrorDto,
} from '../../../../shared/http/dto/api-error.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /** Rate limit comes from ThrottlerModule (20/min in AppModule). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create user',
    description: [
      'Creates a user in Firestore.',
      'If `password` is omitted, generates a secure password, hashes it, and updates the document **before** returning 201.',
      'Publishes `UserCreatedEvent` for audit (log-only; does not mutate again).',
      'Email uniqueness uses claim `emails/{email}` + user doc in one Firestore transaction.',
    ].join(' '),
  })
  @ApiCreatedResponse({
    description: 'User created (password hash never returned)',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed (class-validator / ValidationPipe)',
    type: ValidationApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Email already registered (`code: CONFLICT`)',
    type: DomainApiErrorDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Write rate limit exceeded (20 req/min)',
    type: ThrottleApiErrorDto,
  })
  @ApiBadGatewayResponse({
    description: 'Firestore persistence failure (`code: PERSISTENCE_ERROR`)',
    type: DomainApiErrorDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected error (`code: INTERNAL_ERROR`)',
    type: DomainApiErrorDto,
  })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const result = await this.commandBus.execute<
      CreateUserCommand,
      CreateUserResult
    >(new CreateUserCommand(dto.username, dto.email, dto.password));
    return this.toResponse(result.user, result.passwordGenerated);
  }

  @Get(':id')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Get user by id',
    description:
      'Returns the public user projection. Never includes password or passwordHash.',
  })
  @ApiParam({
    name: 'id',
    description: 'User id returned by create',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User does not exist (`code: NOT_FOUND`)',
    type: DomainApiErrorDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected error (`code: INTERNAL_ERROR`)',
    type: DomainApiErrorDto,
  })
  async getById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.queryBus.execute<GetUserByIdQuery, User>(
      new GetUserByIdQuery(id),
    );
    return this.toResponse(user, user.passwordGenerated);
  }

  private toResponse(user: User, passwordGenerated: boolean): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordGenerated,
      hasPassword: user.hasPassword,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
