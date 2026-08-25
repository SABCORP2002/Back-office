import { SetMetadata } from '@nestjs/common';
import { AdminAction } from './permission-matrix';

export const REQUIRE_ACTION_KEY = 'requireAction';

/** Tags a controller method with the Arch §10 action it performs, for PermissionsGuard to check. */
export const RequireAction = (action: AdminAction) => SetMetadata(REQUIRE_ACTION_KEY, action);
