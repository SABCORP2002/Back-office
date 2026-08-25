import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminRole } from './roles.enum';

export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as { adminId: string; role: AdminRole };
});
