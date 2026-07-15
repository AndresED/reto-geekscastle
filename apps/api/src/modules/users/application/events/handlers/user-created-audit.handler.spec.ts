import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import { UserCreatedAuditHandler } from './user-created-audit.handler';

describe('UserCreatedAuditHandler', () => {
  it('should log without throwing (non-mutating)', () => {
    const handler = new UserCreatedAuditHandler();
    expect(() =>
      handler.handle(new UserCreatedEvent('user-1', true)),
    ).not.toThrow();
  });
});
