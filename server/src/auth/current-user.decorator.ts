import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Pulls `{ userId }` off the request, set by JwtStrategy.validate(). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as { userId: string };
});
