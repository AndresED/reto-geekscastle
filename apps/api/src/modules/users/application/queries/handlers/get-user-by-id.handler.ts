import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { User } from '../../../domain/entities/user.entity';
import { UserNotFoundError } from '../../../domain/errors/user.errors';
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from '../../../domain/ports/user-repository.port';
import { GetUserByIdQuery } from '../get-user-by-id.query';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler
  implements IQueryHandler<GetUserByIdQuery, User>
{
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
  ) {}

  async execute(query: GetUserByIdQuery): Promise<User> {
    const user = await this.users.findById(query.id);
    if (!user) {
      throw new UserNotFoundError(query.id);
    }
    return user;
  }
}
