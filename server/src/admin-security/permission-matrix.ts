import { AdminRole } from './roles.enum';

/**
 * Arch §10 — the exact action×role table, transcribed verbatim. "Un seul
 * compte compromis ne doit jamais permettre de contrôler librement
 * l'infrastructure financière" — this is the one place that rule lives;
 * PermissionsGuard/@RequireAction below are the only way to consult it.
 */
export enum AdminAction {
  CHANGE_TRANSACTION_STATUS = 'CHANGE_TRANSACTION_STATUS',
  FORCE_PROVIDER = 'FORCE_PROVIDER',
  TRIGGER_REFUND = 'TRIGGER_REFUND',
  MODIFY_PRICING = 'MODIFY_PRICING',
  MODIFY_ROUTING = 'MODIFY_ROUTING',
  TOGGLE_PROVIDER = 'TOGGLE_PROVIDER',
  MODIFY_KYC = 'MODIFY_KYC',
  VIEW_TRANSACTION = 'VIEW_TRANSACTION',
}

export const PERMISSION_MATRIX: Record<AdminAction, AdminRole[]> = {
  [AdminAction.CHANGE_TRANSACTION_STATUS]: [AdminRole.OPERATIONS, AdminRole.ADMIN_SYSTEM],
  [AdminAction.FORCE_PROVIDER]: [AdminRole.OPERATIONS, AdminRole.ADMIN_SYSTEM],
  [AdminAction.TRIGGER_REFUND]: [AdminRole.OPERATIONS, AdminRole.FINANCE, AdminRole.ADMIN_SYSTEM],
  [AdminAction.MODIFY_PRICING]: [AdminRole.FINANCE, AdminRole.ADMIN_SYSTEM],
  [AdminAction.MODIFY_ROUTING]: [AdminRole.ADMIN_SYSTEM],
  [AdminAction.TOGGLE_PROVIDER]: [AdminRole.OPERATIONS, AdminRole.ADMIN_SYSTEM],
  [AdminAction.MODIFY_KYC]: [AdminRole.OPERATIONS, AdminRole.ADMIN_SYSTEM],
  [AdminAction.VIEW_TRANSACTION]: [AdminRole.SUPPORT, AdminRole.OPERATIONS, AdminRole.FINANCE, AdminRole.ADMIN_SYSTEM],
};

/** Refund above threshold requires two distinct admin accounts (Arch §10/§9, TDS §13). */
export const DUAL_VALIDATION_ACTIONS: ReadonlySet<AdminAction> = new Set([AdminAction.TRIGGER_REFUND]);

/** "Oui, avec justification" in the Arch §10 table. */
export const JUSTIFICATION_REQUIRED_ACTIONS: ReadonlySet<AdminAction> = new Set([AdminAction.MODIFY_KYC]);

export function isPermitted(role: AdminRole, action: AdminAction): boolean {
  return PERMISSION_MATRIX[action].includes(role);
}
