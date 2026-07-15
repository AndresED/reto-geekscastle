import { Inject, Injectable, Logger } from '@nestjs/common';
import { UserNotFoundError } from '../../domain/errors/user.errors';
import {
  PASSWORD_GENERATOR_PORT,
  type PasswordGeneratorPort,
} from '../../domain/ports/password-generator.port';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from '../../domain/ports/user-repository.port';

/**
 * Request-path finalize for missing-password creates.
 * Not an @EventsHandler — Nest EventBus publish does not await handlers.
 */
@Injectable()
export class FinalizeMissingPasswordService {
  private readonly logger = new Logger(FinalizeMissingPasswordService.name);

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_GENERATOR_PORT)
    private readonly generator: PasswordGeneratorPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    if (user.hasPassword) {
      return;
    }

    const plain = this.generator.generate();
    const passwordHash = await this.hasher.hash(plain);
    await this.users.updatePassword(userId, passwordHash, true);
    this.logger.log(`Password generated for user ${userId}`);
  }
}
