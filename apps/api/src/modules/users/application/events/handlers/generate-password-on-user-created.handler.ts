import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import { UserNotFoundError } from '../../../domain/errors/user.errors';
import {
  PASSWORD_GENERATOR_PORT,
  type PasswordGeneratorPort,
} from '../../../domain/ports/password-generator.port';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from '../../../domain/ports/user-repository.port';

@EventsHandler(UserCreatedEvent)
export class GeneratePasswordOnUserCreatedHandler
  implements IEventHandler<UserCreatedEvent>
{
  private readonly logger = new Logger(
    GeneratePasswordOnUserCreatedHandler.name,
  );

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_GENERATOR_PORT)
    private readonly generator: PasswordGeneratorPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly hasher: PasswordHasherPort,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    if (!event.passwordMissing) {
      return;
    }

    const user = await this.users.findById(event.userId);
    if (!user) {
      throw new UserNotFoundError(event.userId);
    }
    if (user.hasPassword) {
      return;
    }

    const plain = this.generator.generate();
    const passwordHash = await this.hasher.hash(plain);
    await this.users.updatePassword(event.userId, passwordHash, true);
    this.logger.log(`Password generated for user ${event.userId}`);
  }
}
