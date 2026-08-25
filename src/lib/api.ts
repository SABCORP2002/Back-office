import { clearSession, getSession, setSession } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Every function here calls a route that genuinely exists in
 * `backend/src/**\/*.controller.ts` — field names match the real Prisma
 * schema exactly (camelCase, no snake_case), and every admin-guarded route
 * gets a real Bearer token attached. This replaces the previous
 * `lib/api.ts`, which only had one function (`fetchTransactions`) and
 * didn't even attach an auth header — it would have 401'd against the real
 * backend despite the old README's claim of being "proven end-to-end".
 */

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;
  try {
    const res = await fetch(`${API_BASE}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) {
      clearSession();
      return null;
    }
    const { accessToken } = (await res.json()) as { accessToken: string };
    setSession({ ...session, accessToken });
    return accessToken;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (session) headers.Authorization = `Bearer ${session.accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && session && !retried) {
    refreshInFlight ??= doRefresh().finally(() => {
      refreshInFlight = null;
    });
    const newToken = await refreshInFlight;
    if (newToken) return request<T>(path, options, true);
    clearSession();
    window.location.href = '/login';
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') search.set(k, String(v));
  const s = search.toString();
  return s ? `?${s}` : '';
}

/** For file-download endpoints (CSV export) — bypasses the JSON `request()` path. */
async function downloadFile(path: string, filename: string) {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (session) headers.Authorization = `Bearer ${session.accessToken}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Types (mirror backend/prisma/schema.prisma — camelCase, dates as ISO strings)
// ---------------------------------------------------------------------------

export type TxType = 'achat' | 'vente';
export type TxStatus =
  | 'commandeCreee' | 'paiementEnAttente' | 'paiementRecu' | 'cryptoEnCoursEnvoi' | 'cryptoEnvoyee'
  | 'enAttenteDeCrypto' | 'cryptoDetectee' | 'confirmationsBlockchainSuffisantes' | 'paiementMobileMoneyEnCours'
  | 'paiementEffectue' | 'terminee' | 'echec' | 'expiree' | 'annulee' | 'interventionRequise'
  | 'remboursementEnCours' | 'rembourse';

export interface Transaction {
  jalTransactionId: string;
  userId: string;
  type: TxType;
  status: TxStatus;
  crypto: string;
  network: string;
  fiatCurrency: string;
  fiatAmountExpected: string;
  cryptoAmountExpected: string;
  jalRateLocked: string;
  jalMargin: string;
  destinationWalletAddress: string | null;
  depositAddressGenerated: string | null;
  momoOperator: string | null;
  momoNumber: string | null;
  providerId: string | null;
  provider: { id: string; name: string } | null;
  user: { id: string; phone: string | null; email: string | null; country: string };
  createdAt: string;
  updatedAt: string;
  terminalAt: string | null;
}

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  country: string;
  kycStatus: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  kycTier: 'NONE' | 'BASIC' | 'STANDARD' | 'ADVANCED';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  transactionCount?: number;
  totalVolume?: string;
  lastActivityAt?: string | null;
}

export interface KycSubmission {
  id: string;
  userId: string;
  countryOfResidence: string;
  nationality: string;
  documentType: string;
  frontDocRef: string | null;
  backDocRef: string | null;
  selfieRef: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  rejectionReason: string | null;
  createdAt: string;
  user?: { id: string; phone: string | null; email: string | null; country: string; createdAt: string };
}

export interface ProviderConfig {
  id: string;
  name: string;
  supportedCountries: string[];
  supportedCryptos: string[];
  supportedNetworks: string[];
  active: boolean;
  priority: number;
  health: { status: 'UP' | 'DEGRADED' | 'DOWN'; avgLatencyMs: number | null; successRateWindow: number | null; lastCheckAt: string | null } | null;
}

export interface PricingConfig {
  id: string;
  country: string | null;
  crypto: string | null;
  direction: TxType | null;
  marginPct: string;
  marginMinPct: string | null;
  marginMaxPct: string | null;
  feeFixed: string;
  active: boolean;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
  timezone: string | null;
  kycRequired: boolean;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';
  minAmount: string | null;
  maxAmount: string | null;
  dailyMax: string | null;
  description: string | null;
  paymentMethods: Array<{ id: string; name: string; type: string; feePct: string | null; active: boolean }>;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  jalTransactionId: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
  description: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; phone: string | null; email: string | null; country: string };
  notes?: Array<{ id: string; authorId: string; note: string; createdAt: string }>;
}

export interface RoutingRule {
  id: string;
  country: string | null;
  crypto: string | null;
  network: string | null;
  forcedProviderId: string | null;
  active: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string) {
  const result = await post<{ adminId: string; role: 'SUPPORT' | 'OPERATIONS' | 'FINANCE' | 'ADMIN_SYSTEM'; accessToken: string; refreshToken: string }>(
    '/admin/auth/login',
    { email, password },
  );
  setSession(result);
  return result;
}

export function logout() {
  clearSession();
}

export const authApi = {
  sessions: () => get<Array<{ id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastSeenAt: string }>>('/admin/auth/sessions'),
  revokeSession: (id: string) => del(`/admin/auth/sessions/${id}`),
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboardApi = {
  summary: () =>
    get<{
      volumeToday: string; volumeChangePct: number; transactionsToday: number; achatCount: number; venteCount: number;
      transactionsChangePct: number; grossMarginToday: string; grossMarginChangePct: number; netResultEstimateToday: string;
      netResultChangePct: number; activeUsers: number; kycPending: number; blockedTransactions: number; errorRatePct: number;
    }>('/admin/dashboard/summary'),
  charts: (range: '7d' | '30d' | '90d') =>
    get<{
      volumeSeries: Array<{ date: string; volume: string }>;
      achatVsVente: { achat: number; vente: number; total: number };
      byCountry: Array<{ key: string; count: number; pct: number }>;
      byProvider: Array<{ key: string; count: number; pct: number }>;
      byCrypto: Array<{ key: string; volume: string; pct: number }>;
    }>(`/admin/dashboard/charts?range=${range}`),
  alerts: () => get<Array<{ severity: 'critical' | 'warning' | 'info'; title: string; detail: string }>>('/admin/dashboard/alerts'),
};

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const transactionsApi = {
  list: (filters: { status?: string; providerId?: string; country?: string; dateFrom?: string; dateTo?: string } = {}) =>
    get<Transaction[]>(`/admin/transactions${qs(filters)}`),
  detail: (id: string) => get<Transaction & { quote: unknown; paymentAttempts: unknown[]; providerOrders: unknown[]; blockchainTransactions: unknown[]; refund: unknown }>(`/admin/transactions/${id}`),
  timeline: (id: string) => get<Array<{ id: string; eventType: string; previousStatus: string | null; newStatus: string; triggeredBy: string; createdAt: string }>>(`/admin/transactions/${id}/timeline`),
  intervene: (id: string, targetStatus: TxStatus, justification: string) => post(`/admin/transactions/${id}/intervene`, { targetStatus, justification }),
  forceProvider: (id: string, providerId: string, justification: string) => post(`/admin/transactions/${id}/force-provider`, { providerId, justification }),
  retry: (id: string) => post(`/admin/transactions/${id}/retry`),
  refund: (id: string, reason: string, destination: string, coValidatedBy?: string) => post(`/admin/transactions/${id}/refund`, { reason, destination, coValidatedBy }),
  export: (filters: { status?: string; providerId?: string; country?: string; dateFrom?: string; dateTo?: string } = {}) =>
    downloadFile(`/admin/transactions/export${qs(filters)}`, 'jal-trade-transactions.csv'),
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const usersApi = {
  stats: () => get<{ total: number; newThisMonth: number; active: number; suspended: number }>('/admin/users/stats'),
  list: (filters: { country?: string; status?: string; kycStatus?: string; search?: string } = {}) => get<User[]>(`/admin/users${qs(filters)}`),
  detail: (id: string) =>
    get<
      User & {
        wallets: Array<{ id: string; label: string; crypto: string; network: string; address: string }>;
        momoMethods: Array<{ id: string; operatorName: string; phoneNumber: string; isDefault: boolean }>;
        transactions: Transaction[];
        adminNotes: Array<{ id: string; note: string; createdAt: string; admin: { email: string } }>;
        summary: { transactionCount: number; achatCount: number; venteCount: number; totalVolume: number; averageVolume: number; lastActivityAt: string | null };
      }
    >(`/admin/users/${id}`),
  suspend: (id: string, justification: string) => patch(`/admin/users/${id}/suspend`, { justification }),
  reactivate: (id: string, justification: string) => patch(`/admin/users/${id}/reactivate`, { justification }),
  modifyTier: (id: string, tier: User['kycTier'], justification: string) => patch(`/admin/users/${id}/tier`, { tier, justification }),
  requestKyc: (id: string, justification: string) => post(`/admin/users/${id}/request-kyc`, { justification }),
  addNote: (id: string, note: string) => post(`/admin/users/${id}/notes`, { note }),
};

// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------

export const kycApi = {
  stats: () => get<{ pending: number; approved: number; rejected: number; manualReview: number; approvalRatePct: number }>('/admin/kyc/stats'),
  list: (tab: 'pending' | 'approved' | 'rejected' | 'manual_review', filters: { country?: string; documentType?: string; riskLevel?: string; search?: string } = {}) =>
    get<KycSubmission[]>(`/admin/kyc/submissions${qs({ tab, ...filters })}`),
  detail: (id: string) => get<KycSubmission & { user: User }>(`/admin/kyc/submissions/${id}`),
  setRiskLevel: (id: string, riskLevel: KycSubmission['riskLevel']) => post(`/admin/kyc/submissions/${id}/risk-level`, { riskLevel }),
  approve: (id: string, tier: User['kycTier'], justification: string) => post(`/admin/kyc/submissions/${id}/approve`, { tier, justification }),
  reject: (id: string, reason: string) => post(`/admin/kyc/submissions/${id}/reject`, { reason }),
  requestInfo: (id: string, message: string) => post(`/admin/kyc/submissions/${id}/request-info`, { message }),
};

// ---------------------------------------------------------------------------
// Providers + Routing
// ---------------------------------------------------------------------------

export const providersApi = {
  list: () => get<ProviderConfig[]>('/admin/providers'),
  detail: (id: string) => get<ProviderConfig>(`/admin/providers/${id}`),
  testConnections: () => post<Array<{ providerId: string; name: string; status: string; latencyMs: number | null; error: string | null }>>('/admin/providers/test-connections'),
  create: (input: { name: string; supportedCountries: string[]; supportedCryptos: string[]; supportedNetworks: string[]; priority?: number }) => post('/admin/providers', input),
  update: (id: string, input: Partial<{ supportedCountries: string[]; supportedCryptos: string[]; supportedNetworks: string[]; priority: number }>) => patch(`/admin/providers/${id}`, input),
  toggle: (id: string, active: boolean) => patch(`/admin/providers/${id}/toggle`, { active }),
};

export const routingApi = {
  list: () => get<RoutingRule[]>('/admin/routing/rules'),
  create: (input: { country?: string; crypto?: string; network?: string; forcedProviderId?: string }) => post('/admin/routing/rules', input),
  setActive: (id: string, active: boolean) => patch(`/admin/routing/rules/${id}/active`, { active }),
  remove: (id: string) => del(`/admin/routing/rules/${id}`),
};

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export const pricingApi = {
  list: () => get<PricingConfig[]>('/admin/pricing'),
  compareQuotes: (input: { crypto: string; network: string; fiatCurrency: string; amount: number }) =>
    post<Array<{ provider: string; providerRate: number | null; fees: number | null; error: string | null }>>('/admin/pricing/quotes/compare', input),
  breakdown: (input: { crypto: string; network: string; fiatCurrency: string; direction: TxType; country: string; providerRate: number }) =>
    post<{ providerRate: string; marginPct: string; feeFixed: string; jalRateClient: string }>('/admin/pricing/breakdown', input),
  rateHistory: (crypto: string, network: string, fiatCurrency: string, days = 7) =>
    get<Array<{ date: string; providerRate: number; clientRate: number }>>(`/admin/pricing/rate-history${qs({ crypto, network, fiatCurrency, days })}`),
  create: (input: { country?: string; crypto?: string; direction?: TxType; marginPct: number; marginMinPct?: number; marginMaxPct?: number; feeFixed?: number }) => post('/admin/pricing', input),
  update: (id: string, input: Partial<{ marginPct: number; marginMinPct: number; marginMaxPct: number; feeFixed: number; active: boolean }>) => patch(`/admin/pricing/${id}`, input),
  remove: (id: string) => del(`/admin/pricing/${id}`),
};

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

export const countriesApi = {
  stats: () => get<{ activeCountries: number; totalCountries: number; activePaymentMethods: number; totalPaymentMethods: number }>('/admin/countries/stats'),
  list: () => get<Country[]>('/admin/countries'),
  detail: (id: string) => get<Country>(`/admin/countries/${id}`),
  create: (input: { name: string; code: string; currency: string; timezone?: string; kycRequired?: boolean; minAmount?: number; maxAmount?: number; dailyMax?: number; description?: string }) => post('/admin/countries', input),
  update: (id: string, input: Partial<{ status: Country['status']; timezone: string; kycRequired: boolean; minAmount: number; maxAmount: number; dailyMax: number; description: string }>) => patch(`/admin/countries/${id}`, input),
  addPaymentMethod: (countryId: string, input: { name: string; type: string; feePct?: number }) => post(`/admin/countries/${countryId}/payment-methods`, input),
  updatePaymentMethod: (methodId: string, input: Partial<{ active: boolean; feePct: number }>) => patch(`/admin/countries/payment-methods/${methodId}`, input),
  removePaymentMethod: (methodId: string) => del(`/admin/countries/payment-methods/${methodId}`),
};

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

export const supportApi = {
  search: (filters: { jalTransactionId?: string; userId?: string } = {}) => get<SupportTicket[]>(`/admin/support/tickets${qs(filters)}`),
  clientView: (userId: string) =>
    get<User & { wallets: unknown[]; momoMethods: unknown[]; transactions: Transaction[]; supportTickets: SupportTicket[] }>(`/admin/support/clients/${userId}`),
  detail: (id: string) => get<SupportTicket>(`/admin/support/tickets/${id}`),
  updateStatus: (id: string, status: SupportTicket['status']) => patch(`/admin/support/tickets/${id}/status`, { status }),
  addNote: (id: string, note: string) => post(`/admin/support/tickets/${id}/notes`, { note }),
};

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export const financeApi = {
  summary: (dateFrom?: string, dateTo?: string) =>
    get<{ revenueTotal: string; commissions: string; feesAndCharges: string; netProfit: string; availableBalance: string; totalWithdrawn: string }>(`/admin/finance/summary${qs({ dateFrom, dateTo })}`),
  periodBreakdown: (dateFrom: string, dateTo: string) =>
    get<Array<{ date: string; revenueTotal: string; commissions: string; feesAndCharges: string; netProfit: string; marginPct: string }>>(`/admin/finance/period-breakdown${qs({ dateFrom, dateTo })}`),
  export: (dateFrom?: string, dateTo?: string) => downloadFile(`/admin/finance/export${qs({ dateFrom, dateTo })}`, 'jal-trade-finance.csv'),
  withdrawals: () => get<Array<{ id: string; amount: string; currency: string; destination: string | null; status: 'PENDING' | 'PAID' | 'FAILED'; createdAt: string; completedAt: string | null; admin: { email: string } }>>('/admin/finance/withdrawals'),
  requestWithdrawal: (amount: number, currency: string, destination: string, justification: string) => post('/admin/finance/withdrawals', { amount, currency, destination, justification }),
  markPaid: (id: string) => patch(`/admin/finance/withdrawals/${id}/paid`),
};

// ---------------------------------------------------------------------------
// Platform settings
// ---------------------------------------------------------------------------

export const settingsApi = {
  get: () =>
    get<{
      platformName: string; slogan: string | null; contactEmail: string | null; contactPhone: string | null; primaryCurrency: string;
      timezone: string; defaultLanguage: string; notifyNewTransactions: boolean; notifyNewUsers: boolean; notifyKycSubmitted: boolean;
      notifyDisputes: boolean; notifyDailyReports: boolean; notificationEmail: string | null; autoLockMinutes: number; requireHttps: boolean; ipRestriction: boolean;
    }>('/admin/settings'),
  update: (input: Record<string, unknown>) => patch('/admin/settings', input),
  activityLogs: (limit = 50) =>
    get<Array<{ id: string; actionType: string; jalTransactionId: string | null; justification: string; performedAt: string; ipAddress: string | null; admin: { email: string; role: string } }>>(
      `/admin/settings/activity-logs${qs({ limit })}`,
    ),
};

export { ApiError };
