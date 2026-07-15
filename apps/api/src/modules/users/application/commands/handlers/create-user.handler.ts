import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { GeneratePasswordOnUserCreatedHandler } from '../../events/handlers/generate-password-on-user-created.handler';
import { User } from '../../../domain/entities/user.entity';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import { UserNotFoundError } from '../../../domain/errors/user.errors';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from '../../../domain/ports/user-repository.port';
import { CreateUserCommand } from '../create-user.command';

export type CreateUserResult = {
  user: User;
  passwordGenerated: boolean;
};

@CommandHandler(CreateUserCommand)
export class CreateUserHandler
  implements ICommandHandler<CreateUserCommand, CreateUserResult>
{
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly hasher: PasswordHasherPort,
    private readonly eventBus: EventBus,
    private readonly generatePasswordOnUserCreated: GeneratePasswordOnUserCreatedHandler,
  ) {}

  async execute(command: CreateUserCommand): Promise<CreateUserResult> {
    const passwordMissing =
      command.password === undefined ||
      command.password === null ||
      command.password.trim() === '';

    let passwordHash: string | null = null;
    if (!passwordMissing) {
      passwordHash = await this.hasher.hash(command.password!.trim());
    }

    const user = User.create({
      id: randomUUID(),
      username: command.username,
      email: command.email,
      passwordHash,
      passwordGenerated: false,
    });

    const created = await this.users.create(user);
    const event = new UserCreatedEvent(created.id, passwordMissing);

    // Await side-effect in the request path; Nest EventBus publish is fire-and-forget.
    await this.generatePasswordOnUserCreated.handle(event);
    await this.eventBus.publish(event);

    const finalized = passwordMissing
      ? await this.users.findById(created.id)
      : created;

    if (!finalized) {
      throw new UserNotFoundError(created.id);
    }

    return {
      user: finalized,
      passwordGenerated: passwordMissing,
    };
  }
}
