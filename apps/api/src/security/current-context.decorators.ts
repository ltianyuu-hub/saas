import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { SecurityRequest } from './security-request';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<SecurityRequest>().security?.actor,
);

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<SecurityRequest>().security?.tenant,
);

export const CurrentRequestContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<SecurityRequest>().security
      ?.requestContext,
);
