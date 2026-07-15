import {
  NotFoundDomainError,
  PersistenceDomainError,
  ValidationDomainError,
} from '../../../../shared/errors/domain.error';

export class UserNotFoundError extends NotFoundDomainError {
  constructor(id: string) {
    super(`User not found: ${id}`);
  }
}

export class UserPersistenceError extends PersistenceDomainError {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidUserError extends ValidationDomainError {
  constructor(message: string) {
    super(message);
  }
}
