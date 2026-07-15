export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationDomainError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

export class NotFoundDomainError extends DomainError {
  readonly code = 'NOT_FOUND';
}

export class PersistenceDomainError extends DomainError {
  readonly code = 'PERSISTENCE_ERROR';
}
