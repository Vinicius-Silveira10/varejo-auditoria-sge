import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  DomainException,
  NotFoundException,
  ConflictException,
} from '../../../core/exceptions/domain.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: object | string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof DomainException) {
      // Violação de regra de negócio → 400 Bad Request
      status = HttpStatus.BAD_REQUEST;
      message = { message: exception.message, error: 'Bad Request' };
    } else if (exception instanceof NotFoundException) {
      // Recurso não encontrado → 404
      status = HttpStatus.NOT_FOUND;
      message = { message: exception.message, error: 'Not Found' };
    } else if (exception instanceof ConflictException) {
      // Conflito de estado → 409
      status = HttpStatus.CONFLICT;
      message = { message: exception.message, error: 'Conflict' };
    } else {
      // Erro inesperado → 500 (comportamento original preservado)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = { message: exception.message || 'Internal server error' };
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof message === 'object' ? message : { message }),
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - Error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} - Status: ${status}`);
    }

    response.status(status).json(errorResponse);
  }
}

