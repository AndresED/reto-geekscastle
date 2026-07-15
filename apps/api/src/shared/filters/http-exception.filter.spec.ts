import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import {
  ConflictDomainError,
  NotFoundDomainError,
} from '../errors/domain.error';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();
    status.mockReturnValue({ json });
  });

  it('should map domain not found to 404', () => {
    filter.catch(new NotFoundDomainError('missing'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
  });

  it('should map domain conflict to 409', () => {
    filter.catch(new ConflictDomainError('taken'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CONFLICT' }),
    );
  });

  it('should map HttpException status', () => {
    filter.catch(new HttpException('bad', HttpStatus.BAD_REQUEST), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('should hide internal details for unknown errors', () => {
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });
});
