import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { USERS_LIST_MAX } from '../../../../../shared/config/users-list.constants';
import { User } from '../../../domain/entities/user.entity';
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from '../../../domain/ports/user-repository.port';
import { ListUsersQuery } from '../list-users.query';

@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery, User[]> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
  ) {}

  async execute(_query: ListUsersQuery): Promise<User[]> {
    return this.users.list(USERS_LIST_MAX);
  }
}
