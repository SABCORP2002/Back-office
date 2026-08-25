import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminAction, isPermitted } from './permission-matrix';
import { REQUIRE_ACTION_KEY } from './require-action.decorator';

/**
 * Must run after AdminAuthGuard (needs `req.user.role` already populated).
 * Consults the Arch §10 matrix and nothing else — no ad hoc role checks
 * scattered across controllers.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const action = this.reflector.get<AdminAction | undefined>(REQUIRE_ACTION_KEY, context.getHandler());
    if (!action) return true; // no @RequireAction — guard is a no-op for this route

    const request = context.switchToHttp().getRequest();
    const role = request.user?.role;
    if (!role || !isPermitted(role, action)) {
      throw new ForbiddenException(`Role ${role ?? 'unknown'} is not permitted to perform ${action} (Arch §10)`);
    }
    return true;
  }
}
