import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';

/**
 * Non-mutating observer — password write belongs to FinalizeMissingPasswordService.
 * Exists so US-11 has an event-handler file without dual-mutating EventBus.
 */
@EventsHandler(UserCreatedEvent)
export class UserCreatedAuditHandler
  implements IEventHandler<UserCreatedEvent>
{
  private readonly logger = new Logger(UserCreatedAuditHandler.name);

  handle(event: UserCreatedEvent): void {
    this.logger.log(
      `UserCreated userId=${event.userId} passwordMissing=${event.passwordMissing}`,
    );
  }
}
