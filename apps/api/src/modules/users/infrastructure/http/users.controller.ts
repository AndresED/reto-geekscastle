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
import { CreateUserCommand } from '../../application/commands/create-user.command';
import { CreateUserResult } from '../../application/commands/handlers/create-user.handler';
import { GetUserByIdQuery } from '../../application/queries/get-user-by-id.query';
import { User } from '../../domain/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

type UserResponse = {
  id: string;
  username: string;
  email: string;
  passwordGenerated: boolean;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    const result = await this.commandBus.execute<
      CreateUserCommand,
      CreateUserResult
    >(new CreateUserCommand(dto.username, dto.email, dto.password));
    return this.toResponse(result.user, result.passwordGenerated);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<UserResponse> {
    const user = await this.queryBus.execute<GetUserByIdQuery, User>(
      new GetUserByIdQuery(id),
    );
    return this.toResponse(user, user.passwordGenerated);
  }

  private toResponse(user: User, passwordGenerated: boolean): UserResponse {
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
