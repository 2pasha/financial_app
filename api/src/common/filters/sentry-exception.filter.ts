import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Send unhandled exceptions and server 5xx errors to Sentry
    if (
      !(exception instanceof HttpException) ||
      exception.getStatus() >= HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      Sentry.captureException(exception);
    }

    super.catch(exception, host);
  }
}
