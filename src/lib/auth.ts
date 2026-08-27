/**
 * Admin auth against the real backend (`backend/src/admin-security`).
 * Tokens live in localStorage — acceptable for this V1 back-office the same
 * way every other simplification in this project is: documented, not
 * hidden. A real production hardening pass would move to httpOnly cookies.
 */

export type AdminPermission =
  | 'VIEW_DASHBOARD'
  | 'VIEW_TRANSACTIONS'
  | 'EXPORT_TRANSACTIONS'
  | 'INTERVENE_TRANSACTIONS'
  | 'FORCE_TRANSACTION_PROVIDER'
  | 'ISSUE_REFUND'
  | 'VIEW_USERS'
  | 'MANAGE_USERS'
  | 'VIEW_KYC'
  | 'REVIEW_KYC'
  | 'VIEW_SUPPORT'
  | 'MANAGE_SUPPORT'
  | 'VIEW_PROVIDERS'
  | 'MANAGE_PROVIDERS'
  | 'VIEW_PRICING'
  | 'MANAGE_PRICING'
  | 'VIEW_COUNTRIES_PAYMENTS'
  | 'MANAGE_COUNTRIES_PAYMENTS'
  | 'VIEW_ROUTING'
  | 'MANAGE_ROUTING'
  | 'VIEW_GROWTH_PROGRAMS'
  | 'MANAGE_GROWTH_PROGRAMS'
  | 'SETTLE_GROWTH_REWARDS'
  | 'VIEW_FINANCIAL_REPORTS'
  | 'EXPORT_FINANCIAL_REPORTS'
  | 'VIEW_RECONCILIATION'
  | 'VIEW_PLATFORM_SETTINGS'
  | 'MANAGE_PLATFORM_SETTINGS'
  | 'VIEW_AUDIT_LOGS'
  | 'VIEW_ADMIN_USERS'
  | 'MANAGE_ADMIN_USERS';

export interface AdminSession {
  adminId: string;
  role: 'SUPPORT' | 'OPERATIONS' | 'FINANCE' | 'ADMIN_SYSTEM';
  permissions: AdminPermission[];
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY = 'jal_admin_session';

export function getSession(): AdminSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function setSession(session: AdminSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

/** Mirrors backend permission enforcement. The API remains the authority. */
export function hasPermission(permission: AdminPermission): boolean {
  const session = getSession();
  return !!session && (session.role === 'ADMIN_SYSTEM' || session.permissions?.includes(permission));
}
