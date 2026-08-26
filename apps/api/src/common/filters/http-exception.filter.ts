import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      if (typeof res === 'object' && res !== null) {
        if (res.error && res.error.code) {
          errorCode = res.error.code;
          message = res.error.message || exception.message;
          details = res.error.details;
        } else {
          message = res.message || exception.message;
          errorCode = (res.error || 'HTTP_ERROR').toString().toUpperCase().replace(/\s+/g, '_');
          details = res.details;
        }
      } else {
        message = res || exception.message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception on ${request.method} ${request.url}: ${exception.message}`, exception.stack);
      message = process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message;
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
