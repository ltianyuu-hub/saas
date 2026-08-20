import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { SecurityError } from '@saas/identity-access';
import { MerchantBusinessError } from '@saas/merchant';

import type { SecurityRequest } from './security-request';

interface HttpResponse {
  status(code: number): HttpResponse;
  json(body: unknown): void;
}

@Catch(SecurityError, MerchantBusinessError)
export class SecurityExceptionFilter implements ExceptionFilter {
  catch(
    exception: SecurityError | MerchantBusinessError,
    host: ArgumentsHost,
  ): void {
    const http = host.switchToHttp();
    const request = http.getRequest<SecurityRequest>();
    const response = http.getResponse<HttpResponse>();
    response
      .status(exception.httpStatus ?? HttpStatus.INTERNAL_SERVER_ERROR)
      .json({
        error: { code: exception.code, message: exception.message },
        request_id:
          request.security?.requestContext.requestId ??
          request.requestId ??
          'unavailable',
      });
  }
}
