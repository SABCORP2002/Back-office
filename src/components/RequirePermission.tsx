import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { hasPermission, type AdminPermission } from '../lib/auth';

/** Interface guard only; the NestJS PermissionsGuard remains authoritative. */
export function RequirePermission({ permission, children }: { permission: AdminPermission; children: ReactNode }) {
  if (!hasPermission(permission)) {
    const fallback = [
      ['VIEW_DASHBOARD', '/'], ['VIEW_TRANSACTIONS', '/transactions'], ['VIEW_USERS', '/utilisateurs'], ['VIEW_KYC', '/kyc'],
      ['VIEW_PROVIDERS', '/fournisseurs'], ['VIEW_PRICING', '/taux-marges'], ['VIEW_COUNTRIES_PAYMENTS', '/pays-paiements'],
      ['VIEW_SUPPORT', '/support'], ['VIEW_FINANCIAL_REPORTS', '/finance'], ['VIEW_ADMIN_USERS', '/admin-utilisateurs'], ['VIEW_PLATFORM_SETTINGS', '/parametres'],
      ['VIEW_GROWTH_PROGRAMS', '/croissance'],
    ] as const;
    const destination = fallback.find(([candidate]) => hasPermission(candidate))?.[1] ?? '/login';
    return <Navigate to={destination} replace />;
  }
  return <>{children}</>;
}
