import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  NotFoundDomainError,
  PersistenceDomainError,
  ValidationDomainError,
} from '../errors/domain.error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : body,
      );
      return;
    }

    if (exception instanceof DomainError) {
      const status = this.mapDomainStatus(exception);
      response.status(status).json({
        statusCode: status,
        code: exception.code,
        message: exception.message,
      });
      return;
    }

    this.logger.error(
      'Unhandled error',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  }

  private mapDomainStatus(error: DomainError): number {
    if (error instanceof ValidationDomainError) {
      return HttpStatus.BAD_REQUEST;
    }
    if (error instanceof NotFoundDomainError) {
      return HttpStatus.NOT_FOUND;
    }
    if (error instanceof PersistenceDomainError) {
      return HttpStatus.BAD_GATEWAY;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
