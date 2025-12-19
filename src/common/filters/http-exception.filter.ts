import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiError {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  details?: Record<string, any>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ApiError;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      
      error = {
        code: exceptionResponse.code || `HTTP_${status}`,
        message: exceptionResponse.message || exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
        details: exceptionResponse.details,
      };
    } else {
      error = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    response.status(status).json({ error });
  }
}