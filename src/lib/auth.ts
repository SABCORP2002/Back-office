/**
 * Admin auth against the real backend (`backend/src/admin-security`).
 * Tokens live in localStorage — acceptable for this V1 back-office the same
 * way every other simplification in this project is: documented, not
 * hidden. A real production hardening pass would move to httpOnly cookies.
 */

export interface AdminSession {
  adminId: string;
  role: 'SUPPORT' | 'OPERATIONS' | 'FINANCE' | 'ADMIN_SYSTEM';
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
