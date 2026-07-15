import {
  ConflictDomainError,
  NotFoundDomainError,
  PersistenceDomainError,
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

export class UserEmailConflictError extends ConflictDomainError {
  constructor(email: string) {
    super(`Email already registered: ${email}`);
  }
}
