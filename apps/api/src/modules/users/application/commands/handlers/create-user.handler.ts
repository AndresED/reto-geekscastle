import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { User } from '../../../domain/entities/user.entity';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import {
  UserEmailConflictError,
  UserNotFoundError,
} from '../../../domain/errors/user.errors';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from '../../../domain/ports/user-repository.port';
import { CreateUserResult } from '../../create-user.result';
import { FinalizeMissingPasswordService } from '../../finalize-missing-password.service';
import { CreateUserCommand } from '../create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler
  implements ICommandHandler<CreateUserCommand, CreateUserResult>
{
  private readonly logger = new Logger(CreateUserHandler.name);

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly hasher: PasswordHasherPort,
    private readonly eventBus: EventBus,
    private readonly finalizeMissingPassword: FinalizeMissingPasswordService,
  ) {}

  async execute(command: CreateUserCommand): Promise<CreateUserResult> {
    const passwordMissing =
      command.password === undefined ||
      command.password === null ||
      command.password.trim() === '';

    const id = randomUUID();
    const emailProbe = User.create({
      id,
      username: command.username,
      email: command.email,
      passwordHash: null,
    });

    const existing = await this.users.findByEmail(emailProbe.email);
    if (existing) {
      throw new UserEmailConflictError(emailProbe.email);
    }

    let passwordHash: string | null = null;
    if (!passwordMissing) {
      passwordHash = await this.hasher.hash(command.password!.trim());
    }

    const user = User.create({
      id,
      username: command.username,
      email: command.email,
      passwordHash,
      passwordGenerated: false,
    });

    const created = await this.users.create(user);

    if (passwordMissing) {
      try {
        await this.finalizeMissingPassword.execute(created.id);
      } catch (error) {
        await this.compensateCreate(created.id);
        throw error;
      }
    }

    await this.eventBus.publish(
      new UserCreatedEvent(created.id, passwordMissing),
    );

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

  /** Best-effort delete after finalize failure; residual orphan possible if delete also fails. */
  private async compensateCreate(userId: string): Promise<void> {
    try {
      await this.users.delete(userId);
    } catch (deleteError) {
      this.logger.error(
        `Compensate delete failed for user ${userId}: ${
          deleteError instanceof Error ? deleteError.message : String(deleteError)
        }`,
      );
    }
  }
}
