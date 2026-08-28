import { clearSession, getSession, setSession, type AdminPermission } from './auth';

// In the all-in-one Docker delivery, the browser calls the API through the
// same HTTPS domain at `/api`. A separately hosted backoffice can still set
// VITE_API_BASE_URL at build time (for example on Vercel).
const API_BASE = (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '');
const previewModeSetting = import.meta.env.VITE_PREVIEW_MODE?.trim().toLowerCase();

// A static deployment (GitHub Pages, Vercel or a client demo) has no API URL.
// Treat it as the safe, read-only visual preview by default. Connected builds
// explicitly provide VITE_API_BASE_URL (Docker uses /api), while a caller can
// always force either behavior with VITE_PREVIEW_MODE=true|false.
export const isPreviewMode = previewModeSetting === 'true'
  || (previewModeSetting !== 'false' && !import.meta.env.VITE_API_BASE_URL?.trim());

const PREVIEW_ALL_PERMISSIONS: AdminPermission[] = [
  'VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EXPORT_TRANSACTIONS', 'INTERVENE_TRANSACTIONS', 'FORCE_TRANSACTION_PROVIDER', 'ISSUE_REFUND',
  'VIEW_USERS', 'MANAGE_USERS', 'VIEW_KYC', 'REVIEW_KYC', 'VIEW_SUPPORT', 'MANAGE_SUPPORT',
  'VIEW_PROVIDERS', 'MANAGE_PROVIDERS', 'VIEW_PRICING', 'MANAGE_PRICING', 'VIEW_COUNTRIES_PAYMENTS', 'MANAGE_COUNTRIES_PAYMENTS',
  'VIEW_ROUTING', 'MANAGE_ROUTING', 'VIEW_GROWTH_PROGRAMS', 'MANAGE_GROWTH_PROGRAMS', 'SETTLE_GROWTH_REWARDS', 'REVIEW_AMBASSADOR_APPLICATIONS', 'MANAGE_AMBASSADOR_PROGRAM', 'VIEW_FINANCIAL_REPORTS', 'EXPORT_FINANCIAL_REPORTS', 'VIEW_RECONCILIATION', 'VIEW_PLATFORM_SETTINGS',
  'MANAGE_PLATFORM_SETTINGS', 'VIEW_AUDIT_LOGS', 'VIEW_ADMIN_USERS', 'MANAGE_ADMIN_USERS',
];

const PREVIEW_PERMISSION_MATRIX: Record<'SUPPORT' | 'OPERATIONS' | 'FINANCE' | 'ADMIN_SYSTEM', AdminPermission[]> = {
  SUPPORT: ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'VIEW_USERS', 'VIEW_KYC', 'VIEW_SUPPORT', 'MANAGE_SUPPORT', 'VIEW_COUNTRIES_PAYMENTS'],
  OPERATIONS: [
    'VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EXPORT_TRANSACTIONS', 'INTERVENE_TRANSACTIONS', 'FORCE_TRANSACTION_PROVIDER', 'ISSUE_REFUND',
    'VIEW_USERS', 'MANAGE_USERS', 'VIEW_KYC', 'REVIEW_KYC', 'VIEW_SUPPORT', 'MANAGE_SUPPORT', 'VIEW_PROVIDERS', 'MANAGE_PROVIDERS',
    'VIEW_PRICING', 'VIEW_COUNTRIES_PAYMENTS', 'VIEW_ROUTING', 'VIEW_RECONCILIATION', 'VIEW_AUDIT_LOGS', 'VIEW_GROWTH_PROGRAMS',
    'MANAGE_GROWTH_PROGRAMS', 'REVIEW_AMBASSADOR_APPLICATIONS',
  ],
  FINANCE: [
    'VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EXPORT_TRANSACTIONS', 'ISSUE_REFUND', 'VIEW_USERS', 'VIEW_PROVIDERS', 'VIEW_PRICING',
    'MANAGE_PRICING', 'VIEW_COUNTRIES_PAYMENTS', 'VIEW_GROWTH_PROGRAMS', 'MANAGE_GROWTH_PROGRAMS', 'SETTLE_GROWTH_REWARDS',
    'VIEW_FINANCIAL_REPORTS', 'EXPORT_FINANCIAL_REPORTS', 'VIEW_RECONCILIATION',
  ],
  ADMIN_SYSTEM: PREVIEW_ALL_PERMISSIONS,
};

const previewAdminSession = {
  adminId: 'preview-admin',
  role: 'ADMIN_SYSTEM' as const,
  permissions: PREVIEW_ALL_PERMISSIONS,
  accessToken: 'preview-access-token',
  refreshToken: 'preview-refresh-token',
};

// The preview build is a visual demonstration only. None of these records is
// stored, sent to a provider, or used by the production API.
const previewUsers = [
  { id: 'usr-cm-001', phone: '+237 671 234 567', email: 'aissatou.ndiaye@demo.jaltrade.local', country: 'Cameroun', kycStatus: 'APPROVED', kycTier: 'STANDARD', status: 'ACTIVE', createdAt: '2026-06-04T08:30:00.000Z', transactionCount: 18, totalVolume: '2845000', lastActivityAt: '2026-08-25T13:42:00.000Z' },
  { id: 'usr-sn-002', phone: '+221 77 345 67 89', email: 'mamadou.ba@demo.jaltrade.local', country: 'Senegal', kycStatus: 'PENDING', kycTier: 'BASIC', status: 'ACTIVE', createdAt: '2026-07-12T10:10:00.000Z', transactionCount: 7, totalVolume: '968000', lastActivityAt: '2026-08-25T12:18:00.000Z' },
  { id: 'usr-ci-003', phone: '+225 07 58 49 30 21', email: 'fatou.kone@demo.jaltrade.local', country: "Cote d'Ivoire", kycStatus: 'APPROVED', kycTier: 'ADVANCED', status: 'ACTIVE', createdAt: '2026-04-22T15:20:00.000Z', transactionCount: 31, totalVolume: '6523000', lastActivityAt: '2026-08-25T11:07:00.000Z' },
  { id: 'usr-cd-004', phone: '+243 81 234 5678', email: 'joseph.kabeya@demo.jaltrade.local', country: 'RD Congo', kycStatus: 'REJECTED', kycTier: 'NONE', status: 'ACTIVE', createdAt: '2026-08-02T09:00:00.000Z', transactionCount: 2, totalVolume: '185000', lastActivityAt: '2026-08-24T16:40:00.000Z' },
  { id: 'usr-ml-005', phone: '+223 76 54 32 10', email: 'moussa.traore@demo.jaltrade.local', country: 'Mali', kycStatus: 'NOT_STARTED', kycTier: 'NONE', status: 'SUSPENDED', createdAt: '2026-08-10T12:40:00.000Z', transactionCount: 4, totalVolume: '420000', lastActivityAt: '2026-08-21T08:15:00.000Z' },
  { id: 'usr-gh-006', phone: '+233 24 555 0182', email: 'ama.boateng@demo.jaltrade.local', country: 'Ghana', kycStatus: 'PENDING', kycTier: 'BASIC', status: 'ACTIVE', createdAt: '2026-08-18T07:05:00.000Z', transactionCount: 1, totalVolume: '96000', lastActivityAt: '2026-08-25T09:22:00.000Z' },
];

function previewUserIdentity(id: string) {
  const user = previewUsers.find((item) => item.id === id) ?? previewUsers[0];
  return { id: user.id, phone: user.phone, email: user.email, country: user.country };
}

const previewTransactions = [
  { jalTransactionId: 'JAL-2026-A8K2-91M', userId: 'usr-cm-001', type: 'achat', status: 'terminee', crypto: 'USDT', network: 'TRC20', fiatCurrency: 'XAF', fiatAmountExpected: '150000', cryptoAmountExpected: '230.42', jalRateLocked: '651.00', jalMargin: '2250', destinationWalletAddress: 'TQx9a8cDeFghiJKLmNoPqRsTuVwXyZ0123M', depositAddressGenerated: null, momoOperator: 'MTN Mobile Money', momoNumber: '+237 671 234 567', providerId: 'provider-cam-momo', provider: { id: 'provider-cam-momo', name: 'Tranzak Cameroon' }, user: previewUserIdentity('usr-cm-001'), createdAt: '2026-08-25T13:42:00.000Z', updatedAt: '2026-08-25T13:47:00.000Z', terminalAt: '2026-08-25T13:47:00.000Z' },
  { jalTransactionId: 'JAL-2026-B4V1-77Q', userId: 'usr-sn-002', type: 'vente', status: 'paiementMobileMoneyEnCours', crypto: 'USDT', network: 'TRC20', fiatCurrency: 'XOF', fiatAmountExpected: '325000', cryptoAmountExpected: '500', jalRateLocked: '650.00', jalMargin: '4875', destinationWalletAddress: null, depositAddressGenerated: 'TAr5xD2rW8nHqLk4Yp9FsVb3eK0mZtC1Q', momoOperator: 'Wave', momoNumber: '+221 773 456 789', providerId: 'provider-wa-momo', provider: { id: 'provider-wa-momo', name: 'PayDunya West Africa' }, user: previewUserIdentity('usr-sn-002'), createdAt: '2026-08-25T12:18:00.000Z', updatedAt: '2026-08-25T13:18:00.000Z', terminalAt: null },
  { jalTransactionId: 'JAL-2026-C9P7-24L', userId: 'usr-ci-003', type: 'achat', status: 'cryptoEnCoursEnvoi', crypto: 'BTC', network: 'BTC', fiatCurrency: 'XOF', fiatAmountExpected: '800000', cryptoAmountExpected: '0.0127', jalRateLocked: '62992126', jalMargin: '12000', destinationWalletAddress: 'bc1q8t8h3h6g2v9f0c8su8agw3k2k3v8c7l2e0q4pa', depositAddressGenerated: null, momoOperator: 'Orange Money', momoNumber: '+225 075 849 3021', providerId: 'provider-crypto-liquidity', provider: { id: 'provider-crypto-liquidity', name: 'Yellow Card Liquidity' }, user: previewUserIdentity('usr-ci-003'), createdAt: '2026-08-25T11:07:00.000Z', updatedAt: '2026-08-25T11:18:00.000Z', terminalAt: null },
  { jalTransactionId: 'JAL-2026-D2R6-88N', userId: 'usr-cm-001', type: 'vente', status: 'terminee', crypto: 'ETH', network: 'ERC20', fiatCurrency: 'XAF', fiatAmountExpected: '420000', cryptoAmountExpected: '0.189', jalRateLocked: '2222222', jalMargin: '6300', destinationWalletAddress: null, depositAddressGenerated: '0xB5c2A7d9E1f3C8b4D6e0F2a5C7d9E1f3B8c4A6d2', momoOperator: 'Orange Money', momoNumber: '+237 671 234 567', providerId: 'provider-cam-momo', provider: { id: 'provider-cam-momo', name: 'Tranzak Cameroon' }, user: previewUserIdentity('usr-cm-001'), createdAt: '2026-08-24T15:55:00.000Z', updatedAt: '2026-08-24T16:08:00.000Z', terminalAt: '2026-08-24T16:08:00.000Z' },
  { jalTransactionId: 'JAL-2026-E5X3-10B', userId: 'usr-gh-006', type: 'achat', status: 'paiementEnAttente', crypto: 'USDT', network: 'BEP20', fiatCurrency: 'GHS', fiatAmountExpected: '2400', cryptoAmountExpected: '180', jalRateLocked: '13.33', jalMargin: '36', destinationWalletAddress: '0x29fA8c4D6b7E9f1A2c3D4e5F6a7B8c9D0e1F2a3B', depositAddressGenerated: null, momoOperator: 'MTN MoMo', momoNumber: '+233 245 550 182', providerId: 'provider-ghana-momo', provider: { id: 'provider-ghana-momo', name: 'Hub2 Ghana' }, user: previewUserIdentity('usr-gh-006'), createdAt: '2026-08-25T09:22:00.000Z', updatedAt: '2026-08-25T09:22:00.000Z', terminalAt: null },
  { jalTransactionId: 'JAL-2026-F1H8-65T', userId: 'usr-cd-004', type: 'vente', status: 'interventionRequise', crypto: 'USDT', network: 'TRC20', fiatCurrency: 'CDF', fiatAmountExpected: '540000', cryptoAmountExpected: '200', jalRateLocked: '2700', jalMargin: '8100', destinationWalletAddress: null, depositAddressGenerated: 'TPk7s9mA1dC3eF5gH7jK9nP2rT4wX6zB8v', momoOperator: 'M-Pesa', momoNumber: '+243 812 345 678', providerId: 'provider-congo-momo', provider: { id: 'provider-congo-momo', name: 'ElyonPay Congo' }, user: previewUserIdentity('usr-cd-004'), createdAt: '2026-08-24T16:40:00.000Z', updatedAt: '2026-08-24T17:02:00.000Z', terminalAt: null },
  { jalTransactionId: 'JAL-2026-G7M4-39S', userId: 'usr-ml-005', type: 'achat', status: 'echec', crypto: 'USDT', network: 'TRC20', fiatCurrency: 'XOF', fiatAmountExpected: '100000', cryptoAmountExpected: '153.85', jalRateLocked: '650.00', jalMargin: '1500', destinationWalletAddress: 'TUm3f5p7r9sB1d3e5f7g9h1j3k5m7n9p1q', depositAddressGenerated: null, momoOperator: 'Orange Money', momoNumber: '+223 765 432 10', providerId: 'provider-wa-momo', provider: { id: 'provider-wa-momo', name: 'PayDunya West Africa' }, user: previewUserIdentity('usr-ml-005'), createdAt: '2026-08-21T08:15:00.000Z', updatedAt: '2026-08-21T08:20:00.000Z', terminalAt: '2026-08-21T08:20:00.000Z' },
  { jalTransactionId: 'JAL-2026-H6K9-52A', userId: 'usr-ci-003', type: 'vente', status: 'terminee', crypto: 'BTC', network: 'BTC', fiatCurrency: 'XOF', fiatAmountExpected: '1250000', cryptoAmountExpected: '0.02', jalRateLocked: '62500000', jalMargin: '18750', destinationWalletAddress: null, depositAddressGenerated: 'bc1q9n6v2y4k8a3s7d5f0g1h2j3l4m5n6p7q8r9s0t', momoOperator: 'MTN Money', momoNumber: '+225 075 849 3021', providerId: 'provider-wa-momo', provider: { id: 'provider-wa-momo', name: 'PayDunya West Africa' }, user: previewUserIdentity('usr-ci-003'), createdAt: '2026-08-20T10:05:00.000Z', updatedAt: '2026-08-20T10:15:00.000Z', terminalAt: '2026-08-20T10:15:00.000Z' },
];

// Preview-only growth-programme records. They make the static delivery useful
// for demonstrations without contacting the real backend or storing anything
// outside the current browser session.
let previewAmbassadorProgram = {
  id: 'ambassador-program-preview',
  enabled: true,
  promoBenefitValue: '12.50',
  promoMinimumFiatAmount: '15000',
  promoMaximumRedemptions: 250,
  promoNewUsersOnly: true,
  promoFirstCompletedTransaction: true,
  promoDurationDays: 45,
  updatedAt: '2026-08-26T15:40:00.000Z',
};

const previewAmbassadorApplications = [
  {
    id: 'amb-001', displayName: 'Miriam Tech & Finance', tiktokUrl: 'https://www.tiktok.com/@miriamtradehub', facebookUrl: null, youtubeUrl: null, instagramUrl: 'https://www.instagram.com/miriamtradehub', whatsappUrl: 'https://chat.whatsapp.com/demo-miriam', telegramUrl: 'https://t.me/miriamtradehub',
    status: 'PENDING', reviewedBy: null, reviewedAt: null, rejectionReason: null, createdAt: '2026-08-26T11:15:00.000Z',
    user: { id: 'usr-gh-006', email: 'ama.boateng@demo.jaltrade.local', phone: '+233 24 555 0182', country: 'Ghana', kycStatus: 'APPROVED' }, promoCampaign: null,
  },
  {
    id: 'amb-002', displayName: 'Crypto Dakar Communauté', tiktokUrl: null, facebookUrl: 'https://www.facebook.com/cryptodakar', youtubeUrl: 'https://www.youtube.com/@cryptodakar', instagramUrl: 'https://www.instagram.com/cryptodakar', whatsappUrl: 'https://chat.whatsapp.com/demo-dakar', telegramUrl: 'https://t.me/cryptodakar',
    status: 'APPROVED', reviewedBy: 'demo@jaltrade.com', reviewedAt: '2026-08-24T16:30:00.000Z', rejectionReason: null, createdAt: '2026-08-20T09:20:00.000Z',
    user: { id: 'usr-sn-002', email: 'mamadou.ba@demo.jaltrade.local', phone: '+221 77 345 67 89', country: 'Sénégal', kycStatus: 'APPROVED' },
    promoCampaign: { id: 'promo-004', code: 'DAKARJAL', active: true, redemptionsReserved: 47, endsAt: '2026-10-08T23:59:59.000Z' },
  },
  {
    id: 'amb-003', displayName: 'Mali Web3 Famille', tiktokUrl: null, facebookUrl: 'https://www.facebook.com/maliweb3famille', youtubeUrl: null, instagramUrl: null, whatsappUrl: null, telegramUrl: 'https://t.me/maliweb3famille',
    status: 'REJECTED', reviewedBy: 'operations@jaltrade.com', reviewedAt: '2026-08-22T10:05:00.000Z', rejectionReason: 'Ajoutez un lien administrable ou une preuve d’audience récente.', createdAt: '2026-08-19T14:40:00.000Z',
    user: { id: 'usr-ml-005', email: 'moussa.traore@demo.jaltrade.local', phone: '+223 76 54 32 10', country: 'Mali', kycStatus: 'APPROVED' }, promoCampaign: null,
  },
  {
    id: 'amb-004', displayName: 'Kinshasa Crypto Réseau', tiktokUrl: 'https://www.tiktok.com/@kinshasacrypto', facebookUrl: null, youtubeUrl: null, instagramUrl: 'https://www.instagram.com/kinshasacrypto', whatsappUrl: 'https://chat.whatsapp.com/demo-kinshasa', telegramUrl: null,
    status: 'PENDING', reviewedBy: null, reviewedAt: null, rejectionReason: null, createdAt: '2026-08-25T18:10:00.000Z',
    user: { id: 'usr-cd-004', email: 'joseph.kabeya@demo.jaltrade.local', phone: '+243 81 234 5678', country: 'RD Congo', kycStatus: 'APPROVED' }, promoCampaign: null,
  },
] as Array<Record<string, unknown>>;

function previewBody(options: RequestInit): Record<string, unknown> {
  if (!options.body || typeof options.body !== 'string') return {};
  try { return JSON.parse(options.body) as Record<string, unknown>; } catch { return {}; }
}

/**
 * Visual-only payloads used by the client preview build. They never reach a
 * server and are deliberately kept separate from the production API flow.
 */
function previewResponse<T>(path: string, options: RequestInit = {}): T {
  if (path.startsWith('/admin/dashboard/summary')) {
    return {
      range: { startDate: '2026-08-19', endDate: '2026-08-25' }, comparisonRange: { startDate: '2026-08-12', endDate: '2026-08-18' },
      volume: '1250000', volumeToday: '1250000', volumeChangePct: 8.4, transactionsCount: 42, transactionsToday: 42,
      achatCount: 26, venteCount: 16, transactionsChangePct: 12.1,
      grossMargin: '48750', grossMarginChangePct: 6.2,
      netResultEstimate: '42100', netResultChangePct: 5.8,
      activeUsers: 318, kycPending: 12, blockedTransactions: 2, errorRatePct: 0.4,
    } as T;
  }
  if (path.startsWith('/admin/dashboard/charts')) {
    return {
      volumeSeries: [
        { date: '2026-08-19', volume: '820000' }, { date: '2026-08-20', volume: '1040000' },
        { date: '2026-08-21', volume: '910000' }, { date: '2026-08-22', volume: '1330000' },
        { date: '2026-08-23', volume: '1170000' }, { date: '2026-08-24', volume: '1480000' },
        { date: '2026-08-25', volume: '1250000' },
      ],
      achatVsVente: { achat: 26, vente: 16, total: 42 },
      byCountry: [{ key: 'Cameroun', count: 21, pct: 50 }, { key: 'Sénégal', count: 13, pct: 31 }, { key: 'Côte d’Ivoire', count: 8, pct: 19 }],
      byProvider: [{ key: 'Mobile Money', count: 29, pct: 69 }, { key: 'Crypto', count: 13, pct: 31 }],
      byCrypto: [{ key: 'USDT', volume: '830000', pct: 66 }, { key: 'BTC', volume: '270000', pct: 22 }, { key: 'ETH', volume: '150000', pct: 12 }],
    } as T;
  }
  if (path.startsWith('/admin/dashboard/acquisition')) {
    return {
      range: { startDate: '2026-08-19', endDate: '2026-08-25' },
      totalRegistrations: 58,
      totalActivatedUsers: 31,
      sources: [
        { source: 'REFERRAL', registrations: 18, sharePct: 31.0, activeUsers: 13, activationRatePct: 72.2 },
        { source: 'PAID_ADS', registrations: 12, sharePct: 20.7, activeUsers: 4, activationRatePct: 33.3 },
        { source: 'SOCIAL_MEDIA', registrations: 15, sharePct: 25.9, activeUsers: 8, activationRatePct: 53.3 },
        { source: 'AMBASSADOR_OR_PROMO', registrations: 8, sharePct: 13.8, activeUsers: 5, activationRatePct: 62.5 },
        { source: 'WEB_OR_OTHER', registrations: 5, sharePct: 8.6, activeUsers: 1, activationRatePct: 20.0 },
        { source: 'NOT_RECORDED', registrations: 0, sharePct: 0, activeUsers: 0, activationRatePct: 0 },
      ],
    } as T;
  }
  if (path === '/admin/dashboard/alerts') {
    return [
      { severity: 'warning', title: '3 dossiers KYC a examiner', detail: 'Des controles documentaires attendent une decision manuelle.' },
      { severity: 'critical', title: 'Paiement a verifier', detail: 'La transaction JAL-2026-F1H8-65T attend une intervention operationnelle.' },
      { severity: 'info', title: 'Rapport quotidien disponible', detail: 'Le recapitulatif financier fictif du 25 aout est pret a consulter.' },
      { severity: 'warning', title: 'Latence fournisseur elevee', detail: 'Yellow Card Liquidity a depasse le seuil de reponse de demonstration.' },
    ] as T;
  }
  if (path === '/admin/admin-users') {
    return [
      { id: 'preview-admin', email: 'demo@jaltrade.com', displayName: 'Super Administrateur', role: 'ADMIN_SYSTEM', isActive: true, permissions: PREVIEW_ALL_PERMISSIONS, permissionsConfigured: false, createdAt: '2026-08-01T09:00:00.000Z', updatedAt: '2026-08-25T14:00:00.000Z' },
      { id: 'preview-finance', email: 'finance@jaltrade.com', displayName: 'Équipe Finance', role: 'FINANCE', isActive: true, permissions: ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EXPORT_TRANSACTIONS', 'ISSUE_REFUND', 'VIEW_PRICING', 'MANAGE_PRICING', 'VIEW_FINANCIAL_REPORTS', 'EXPORT_FINANCIAL_REPORTS', 'VIEW_RECONCILIATION'], permissionsConfigured: true, createdAt: '2026-08-08T09:00:00.000Z', updatedAt: '2026-08-24T11:30:00.000Z' },
      { id: 'preview-support', email: 'support@jaltrade.com', displayName: 'Support Afrique', role: 'SUPPORT', isActive: true, permissions: ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'VIEW_USERS', 'VIEW_SUPPORT', 'MANAGE_SUPPORT'], permissionsConfigured: true, createdAt: '2026-08-10T09:00:00.000Z', updatedAt: '2026-08-25T09:14:00.000Z' },
      { id: 'preview-audit', email: 'audit@jaltrade.com', displayName: 'Audit interne', role: 'OPERATIONS', isActive: false, permissions: ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'VIEW_KYC', 'VIEW_RECONCILIATION', 'VIEW_AUDIT_LOGS'], permissionsConfigured: true, createdAt: '2026-08-12T09:00:00.000Z', updatedAt: '2026-08-22T16:22:00.000Z' },
      { id: 'preview-operations', email: 'operations@jaltrade.com', displayName: 'Équipe Opérations', role: 'OPERATIONS', isActive: true, permissions: ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EXPORT_TRANSACTIONS', 'INTERVENE_TRANSACTIONS', 'FORCE_TRANSACTION_PROVIDER', 'VIEW_USERS', 'MANAGE_USERS', 'VIEW_KYC', 'REVIEW_KYC', 'VIEW_SUPPORT', 'MANAGE_SUPPORT', 'VIEW_PROVIDERS', 'MANAGE_PROVIDERS', 'VIEW_ROUTING', 'VIEW_RECONCILIATION'], permissionsConfigured: true, createdAt: '2026-08-04T09:00:00.000Z', updatedAt: '2026-08-25T14:00:00.000Z' },
    ] as T;
    /* Legacy preview records retained only as source history for older browser bundles.
       The return above is the only preview payload used by current builds.
    return [
      { id: 'preview-admin', email: 'demo@jaltrade.com', displayName: 'Super Administrateur', role: 'ADMIN_SYSTEM', isActive: true, permissions: PREVIEW_ALL_PERMISSIONS, permissionsConfigured: false, createdAt: '2026-08-01T09:00:00.000Z', updatedAt: '2026-08-25T14:00:00.000Z' },
      { id: 'preview-finance', email: 'finance@jaltrade.com', displayName: 'Equipe Finance', role: 'FINANCE', isActive: true, permissions: ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EXPORT_TRANSACTIONS', 'ISSUE_REFUND', 'VIEW_PRICING', 'MANAGE_PRICING', 'VIEW_FINANCIAL_REPORTS', 'EXPORT_FINANCIAL_REPORTS', 'VIEW_RECONCILIATION'], permissionsConfigured: true, createdAt: '2026-08-08T09:00:00.000Z', updatedAt: '2026-08-24T11:30:00.000Z' },
      { id: 'preview-support', email: 'support@jaltrade.com', displayName: 'Support Afrique', role: 'SUPPORT', isActive: true, permissions: ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'VIEW_USERS', 'VIEW_SUPPORT', 'MANAGE_SUPPORT'], permissionsConfigured: true, createdAt: '2026-08-10T09:00:00.000Z', updatedAt: '2026-08-25T09:14:00.000Z' },
      { id: 'preview-audit', email: 'audit@jaltrade.com', displayName: 'Audit interne', role: 'OPERATIONS', isActive: false, permissions: ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'VIEW_KYC', 'VIEW_RECONCILIATION', 'VIEW_AUDIT_LOGS'], permissionsConfigured: true, createdAt: '2026-08-12T09:00:00.000Z', updatedAt: '2026-08-22T16:22:00.000Z' },
      { id: 'preview-operations', email: 'operations@jaltrade.com', displayName: 'Équipe Opérations', role: 'OPERATIONS', isActive: true, permissions: ['VIEW_TRANSACTION', 'CHANGE_TRANSACTION_STATUS', 'FORCE_PROVIDER', 'TRIGGER_REFUND', 'TOGGLE_PROVIDER', 'MODIFY_KYC'], permissionsConfigured: true, createdAt: '2026-08-04T09:00:00.000Z', updatedAt: '2026-08-25T14:00:00.000Z' },
    ] as T; */
  }
  if (path === '/admin/admin-users/permission-matrix') return PREVIEW_PERMISSION_MATRIX as T;
  if (path === '/admin/users/stats') return { total: 624, newThisMonth: 58, active: 318, suspended: 4 } as T;
  if (path === '/admin/kyc/stats') return { pending: 12, approved: 285, rejected: 7, manualReview: 3, approvalRatePct: 95.6 } as T;
  if (path === '/admin/countries/stats') return { activeCountries: 8, totalCountries: 8, activePaymentMethods: 22, totalPaymentMethods: 24 } as T;
  if (path.startsWith('/admin/finance/summary')) {
    return { revenueTotal: '3720000', commissions: '3415000', feesAndCharges: '305000', netProfit: '2984000' } as T;
  }
  if (path.startsWith('/admin/finance/period-breakdown')) {
    return [
      { date: '2026-08-19', revenueTotal: '415000', commissions: '378000', feesAndCharges: '37000', netProfit: '331000', marginPct: '4.82' },
      { date: '2026-08-20', revenueTotal: '520000', commissions: '475000', feesAndCharges: '45000', netProfit: '416000', marginPct: '5.04' },
      { date: '2026-08-21', revenueTotal: '465000', commissions: '424000', feesAndCharges: '41000', netProfit: '368000', marginPct: '4.76' },
      { date: '2026-08-22', revenueTotal: '580000', commissions: '528000', feesAndCharges: '52000', netProfit: '459000', marginPct: '5.18' },
      { date: '2026-08-23', revenueTotal: '501000', commissions: '458000', feesAndCharges: '43000', netProfit: '402000', marginPct: '4.91' },
      { date: '2026-08-24', revenueTotal: '644000', commissions: '590000', feesAndCharges: '54000', netProfit: '514000', marginPct: '5.26' },
      { date: '2026-08-25', revenueTotal: '595000', commissions: '562000', feesAndCharges: '33000', netProfit: '494000', marginPct: '5.11' },
    ] as T;
  }
  if (path === '/admin/providers') {
    return [
      {
        id: 'provider-cam-momo', name: 'Cameroun Mobile Money', visibleName: null,
        supportedCountries: ['CM'], supportedCryptos: ['USDT', 'BTC'], supportedNetworks: ['TRC20'],
        active: true, priority: 1, minimumPayment: null, maximumPayment: null, notes: null,
        health: { status: 'UP', avgLatencyMs: 184, successRateWindow: 99.4, lastCheckAt: '2026-08-25T13:25:00.000Z' },
      },
      {
        id: 'provider-wa-momo', name: 'Afrique de l’Ouest Mobile Money', visibleName: null,
        supportedCountries: ['CI', 'SN', 'ML', 'BF'], supportedCryptos: ['USDT'], supportedNetworks: ['TRC20', 'BEP20'],
        active: true, priority: 2, minimumPayment: null, maximumPayment: null, notes: null,
        health: { status: 'UP', avgLatencyMs: 237, successRateWindow: 98.9, lastCheckAt: '2026-08-25T13:24:00.000Z' },
      },
      {
        id: 'provider-crypto-liquidity', name: 'Liquidité Crypto JAL', visibleName: null,
        supportedCountries: ['CM', 'CI', 'SN', 'ML', 'CD'], supportedCryptos: ['USDT', 'BTC', 'ETH'], supportedNetworks: ['TRC20', 'ERC20', 'BEP20'],
        active: true, priority: 3, minimumPayment: '10', maximumPayment: '5000', notes: null,
        health: { status: 'DEGRADED', avgLatencyMs: 642, successRateWindow: 96.7, lastCheckAt: '2026-08-25T13:23:00.000Z' },
      },
      {
        id: 'provider-ghana-momo', name: 'Hub2 Ghana', visibleName: 'Ghana Mobile Money',
        supportedCountries: ['GH'], supportedCryptos: ['USDT'], supportedNetworks: ['TRC20', 'BEP20'],
        active: true, priority: 4, minimumPayment: '10', maximumPayment: '30000', notes: 'Preview provider only.',
        health: { status: 'UP', avgLatencyMs: 219, successRateWindow: 99.1, lastCheckAt: '2026-08-25T13:22:00.000Z' },
      },
      {
        id: 'provider-congo-momo', name: 'ElyonPay Congo', visibleName: 'RD Congo Mobile Money',
        supportedCountries: ['CD'], supportedCryptos: ['USDT'], supportedNetworks: ['TRC20'],
        active: false, priority: 5, minimumPayment: '1000', maximumPayment: '5000000', notes: 'Maintenance preview.',
        health: { status: 'DOWN', avgLatencyMs: null, successRateWindow: 0, lastCheckAt: '2026-08-25T13:15:00.000Z' },
      },
    ] as T;
  }
  if (path.startsWith('/admin/payment-providers')) {
    return [
      {
        kind: 'crypto', id: 'provider-crypto-liquidity', name: 'YellowCard', visibleName: 'Liquidité Crypto JAL', active: true,
        balance: 128450, balanceCurrency: 'USDT', balanceStatus: 'AVAILABLE', balanceUpdatedAt: '2026-08-25T13:20:00.000Z',
        averageTimeMs: 184_000, minimumPayment: 10, maximumPayment: 5000, hasApiKeyConfigured: true,
        callbackPath: '/webhooks/provider/provider-crypto-liquidity', notes: null,
        createdAt: '2026-01-10T09:00:00.000Z', updatedAt: '2026-08-25T13:20:00.000Z',
      },
      {
        kind: 'momo', id: 'provider-cam-momo', name: 'Tranzak', visibleName: 'Cameroun Mobile Money', active: true,
        balance: null, balanceCurrency: null, balanceStatus: 'UNAVAILABLE', balanceUpdatedAt: null,
        averageTimeMs: 42_000, minimumPayment: 500, maximumPayment: 2_000_000, hasApiKeyConfigured: true,
        callbackPath: '/webhooks/momo/Tranzak', notes: null,
        createdAt: '2026-01-10T09:00:00.000Z', updatedAt: '2026-08-24T10:00:00.000Z',
      },
      {
        kind: 'momo', id: 'provider-wa-momo', name: 'PayDunya', visibleName: 'West Africa Mobile Money', active: true,
        balance: null, balanceCurrency: null, balanceStatus: 'UNAVAILABLE', balanceUpdatedAt: null,
        averageTimeMs: 51_000, minimumPayment: 500, maximumPayment: 3_000_000, hasApiKeyConfigured: true,
        callbackPath: '/webhooks/momo/PayDunya', notes: 'Preview routing for Senegal and Cote d Ivoire.',
        createdAt: '2026-02-11T09:00:00.000Z', updatedAt: '2026-08-25T12:15:00.000Z',
      },
      {
        kind: 'momo', id: 'provider-ghana-momo', name: 'Hub2', visibleName: 'Ghana Mobile Money', active: true,
        balance: null, balanceCurrency: null, balanceStatus: 'UNAVAILABLE', balanceUpdatedAt: null,
        averageTimeMs: 47_000, minimumPayment: 10, maximumPayment: 30_000, hasApiKeyConfigured: true,
        callbackPath: '/webhooks/momo/Hub2', notes: 'Preview routing for Ghana.',
        createdAt: '2026-03-18T09:00:00.000Z', updatedAt: '2026-08-25T11:52:00.000Z',
      },
      {
        kind: 'crypto', id: 'provider-reserve-liquidity', name: 'Reserve Liquidity', visibleName: 'JAL Reserve', active: false,
        balance: 45000, balanceCurrency: 'USDT', balanceStatus: 'AVAILABLE', balanceUpdatedAt: '2026-08-24T23:00:00.000Z',
        averageTimeMs: 360_000, minimumPayment: 25, maximumPayment: 2500, hasApiKeyConfigured: false,
        callbackPath: '/webhooks/provider/reserve-liquidity', notes: 'Disabled reserve in preview.',
        createdAt: '2026-05-02T09:00:00.000Z', updatedAt: '2026-08-24T23:00:00.000Z',
      },
    ] as T;
  }
  if (path.startsWith('/admin/momo-providers')) {
    return [
      { id: 'provider-cam-momo', name: 'Tranzak', visibleName: 'Cameroun Mobile Money', countries: ['Cameroun'], active: true, minimumPayment: '500', maximumPayment: '2000000', notes: null },
      { id: 'provider-wa-momo', name: 'PayDunya', visibleName: 'West Africa Mobile Money', countries: ['Senegal', "Cote d'Ivoire", 'Mali', 'Burkina Faso', 'Benin'], active: true, minimumPayment: '500', maximumPayment: '3000000', notes: 'Preview provider.' },
      { id: 'provider-ghana-momo', name: 'Hub2', visibleName: 'Ghana Mobile Money', countries: ['Ghana'], active: true, minimumPayment: '10', maximumPayment: '30000', notes: 'Preview provider.' },
      { id: 'provider-congo-momo', name: 'ElyonPay', visibleName: 'RD Congo Mobile Money', countries: ['RD Congo'], active: false, minimumPayment: '1000', maximumPayment: '5000000', notes: 'Maintenance preview.' },
    ] as T;
  }
  if (path === '/admin/providers/test-connections') {
    return [
      { providerId: 'provider-cam-momo', name: 'Cameroun Mobile Money', status: 'UP', latencyMs: 184, error: null },
      { providerId: 'provider-wa-momo', name: 'Afrique de l’Ouest Mobile Money', status: 'UP', latencyMs: 237, error: null },
      { providerId: 'provider-crypto-liquidity', name: 'Liquidité Crypto JAL', status: 'DEGRADED', latencyMs: 642, error: 'Temps de réponse élevé' },
    ] as T;
  }
  if (path === '/admin/routing/rules') {
    return [
      { id: 'routing-cam-usdt', country: 'CM', crypto: 'USDT', network: 'TRC20', forcedProviderId: 'provider-cam-momo', active: true, createdAt: '2026-08-20T09:00:00.000Z' },
      { id: 'routing-wa-usdt', country: 'CI', crypto: 'USDT', network: 'TRC20', forcedProviderId: 'provider-wa-momo', active: true, createdAt: '2026-08-20T09:00:00.000Z' },
      { id: 'routing-sen-wave', country: 'SN', crypto: 'USDT', network: 'BEP20', forcedProviderId: 'provider-wa-momo', active: true, createdAt: '2026-08-21T09:00:00.000Z' },
      { id: 'routing-ghana-usdt', country: 'GH', crypto: 'USDT', network: 'TRC20', forcedProviderId: 'provider-ghana-momo', active: true, createdAt: '2026-08-22T09:00:00.000Z' },
      { id: 'routing-congo-usdt', country: 'CD', crypto: 'USDT', network: 'TRC20', forcedProviderId: 'provider-congo-momo', active: false, createdAt: '2026-08-23T09:00:00.000Z' },
    ] as T;
  }
  if (path === '/admin/growth/referral-program') {
    return {
      id: 'default', enabled: true, minimumFiatAmount: '10000', rewardType: 'PERCENT_OF_JAL_MARGIN', rewardValue: '10.00', rewardCurrency: null,
      requiresKycApproval: true, firstCompletedTransaction: true, updatedAt: '2026-08-26T09:20:00.000Z',
    } as T;
  }
  if (path === '/admin/growth/ambassador-program') {
    if (options.method === 'PUT') {
      previewAmbassadorProgram = { ...previewAmbassadorProgram, ...previewBody(options), updatedAt: new Date().toISOString() };
    }
    return previewAmbassadorProgram as T;
  }
  if (path === '/admin/growth/ambassador-applications') return previewAmbassadorApplications as T;
  if (path.startsWith('/admin/growth/ambassador-applications/')) {
    const [, , , , id, action] = path.split('/');
    const application = previewAmbassadorApplications.find((item) => item.id === id);
    if (!application) return {} as T;
    if (action === 'approve') {
      application.status = 'APPROVED';
      application.reviewedBy = 'demo@jaltrade.com';
      application.reviewedAt = new Date().toISOString();
      application.rejectionReason = null;
      application.promoCampaign = {
        id: `promo-${id}`, code: `JAL${String(application.displayName).replace(/[^A-Za-z]/g, '').slice(0, 8).toUpperCase()}`,
        active: true, redemptionsReserved: 0, endsAt: '2026-10-31T23:59:59.000Z',
      };
    }
    if (action === 'reject') {
      application.status = 'REJECTED';
      application.reviewedBy = 'demo@jaltrade.com';
      application.reviewedAt = new Date().toISOString();
      application.rejectionReason = String(previewBody(options).reason ?? 'Informations complémentaires requises.');
    }
    return application as T;
  }
  if (path.startsWith('/admin/growth/referrals')) {
    return [
      { id: 'ref-001', status: 'QUALIFIED', codeSnapshot: 'JAL-9CM8F4', createdAt: '2026-08-05T10:10:00.000Z', referrer: previewUserIdentity('usr-cm-001'), referredUser: { ...previewUserIdentity('usr-sn-002'), kycStatus: 'APPROVED' }, reward: { id: 'reward-001', calculatedAmount: '1185.00', currency: 'XAF', status: 'APPROVED' } },
      { id: 'ref-002', status: 'PENDING', codeSnapshot: 'JAL-9CM8F4', createdAt: '2026-08-19T08:40:00.000Z', referrer: previewUserIdentity('usr-cm-001'), referredUser: { ...previewUserIdentity('usr-gh-006'), kycStatus: 'PENDING' }, reward: null },
      { id: 'ref-003', status: 'QUALIFIED', codeSnapshot: 'JAL-8CI3M9', createdAt: '2026-07-22T15:22:00.000Z', referrer: previewUserIdentity('usr-ci-003'), referredUser: { ...previewUserIdentity('usr-cd-004'), kycStatus: 'APPROVED' }, reward: { id: 'reward-002', calculatedAmount: '3200.00', currency: 'XOF', status: 'SETTLED' } },
    ] as T;
  }
  if (path.startsWith('/admin/growth/rewards')) {
    return [
      { id: 'reward-001', calculatedAmount: '1185.00', currency: 'XAF', status: 'APPROVED', createdAt: '2026-08-24T12:00:00.000Z', settlementReference: null, referral: { referrer: previewUserIdentity('usr-cm-001'), referredUser: previewUserIdentity('usr-sn-002') } },
      { id: 'reward-002', calculatedAmount: '3200.00', currency: 'XOF', status: 'SETTLED', createdAt: '2026-08-20T11:10:00.000Z', settlementReference: 'MOMO-SETTLE-20260820-02', referral: { referrer: previewUserIdentity('usr-ci-003'), referredUser: previewUserIdentity('usr-cd-004') } },
    ] as T;
  }
  if (path.startsWith('/admin/growth/promotions')) {
    return [
      { id: 'promo-001', code: 'BIENVENUE10', name: 'Bienvenue JAL', description: 'Réduction de 10% sur la marge de votre première transaction.', benefitType: 'MARGIN_DISCOUNT_PERCENT', benefitValue: '10.00', active: true, minimumFiatAmount: '10000', maximumRedemptions: 5000, redemptionsReserved: 184, newUsersOnly: true, firstCompletedTransaction: true, countries: ['CAMEROUN', 'SENEGAL', "COTE D'IVOIRE"], cryptos: ['USDT', 'BTC'], startsAt: '2026-08-01T00:00:00.000Z', endsAt: '2026-10-31T23:59:59.000Z', _count: { redemptions: 184 } },
      { id: 'promo-002', code: 'JALAFRICA', name: 'Lancement Afrique', description: 'Avantage de lancement pour les nouveaux marchés.', benefitType: 'MARGIN_DISCOUNT_PERCENT', benefitValue: '15.00', active: true, minimumFiatAmount: null, maximumRedemptions: null, redemptionsReserved: 62, newUsersOnly: false, firstCompletedTransaction: true, countries: [], cryptos: ['USDT'], startsAt: '2026-08-15T00:00:00.000Z', endsAt: '2026-09-30T23:59:59.000Z', _count: { redemptions: 62 } },
      { id: 'promo-003', code: 'TESTPARTNER', name: 'Partenaire pilote', description: 'Campagne inactive de démonstration.', benefitType: 'MARGIN_DISCOUNT_PERCENT', benefitValue: '5.00', active: false, minimumFiatAmount: '25000', maximumRedemptions: 300, redemptionsReserved: 300, newUsersOnly: false, firstCompletedTransaction: false, countries: ['GHANA'], cryptos: ['USDT'], startsAt: '2026-07-01T00:00:00.000Z', endsAt: '2026-08-01T00:00:00.000Z', _count: { redemptions: 300 } },
    ] as T;
  }
  if (path === '/admin/settings') {
    return {
      platformName: 'JAL Trade', slogan: 'Votre crypto, votre contrôle.', contactEmail: 'support@jaltrade.com', contactPhone: '+237 6 00 00 00 00',
      primaryCurrency: 'XAF', timezone: 'Africa/Douala', defaultLanguage: 'fr', notifyNewTransactions: true, notifyNewUsers: true,
      notifyKycSubmitted: true, notifyDisputes: true, notifyDailyReports: false, notificationEmail: 'support@jaltrade.com',
      autoLockMinutes: 30, requireHttps: true, ipRestriction: false,
    } as T;
  }
  if (path.startsWith('/admin/transactions/')) {
    const transaction = previewTransactions.find((item) => item.jalTransactionId === path.split('/').pop()) ?? previewTransactions[0];
    if (path.endsWith('/timeline')) {
      return [
        { id: 'timeline-01', eventType: 'commande_creee', previousStatus: null, newStatus: 'commandeCreee', triggeredBy: 'SYSTEM', createdAt: transaction.createdAt },
        { id: 'timeline-02', eventType: 'paiement_recu', previousStatus: 'paiementEnAttente', newStatus: 'paiementRecu', triggeredBy: 'PROVIDER_CALLBACK', createdAt: transaction.updatedAt },
        { id: 'timeline-03', eventType: 'controle', previousStatus: 'paiementRecu', newStatus: transaction.status, triggeredBy: 'ADMIN_PREVIEW', createdAt: transaction.updatedAt },
      ] as T;
    }
    return { ...transaction, quote: { source: 'preview', amount: transaction.fiatAmountExpected }, paymentAttempts: [{ id: 'attempt-01', status: transaction.status }], providerOrders: [{ id: 'provider-order-01', provider: transaction.provider?.name }], blockchainTransactions: transaction.depositAddressGenerated ? [{ hash: '0xpreview' }] : [], refund: null } as T;
  }
  if (path.startsWith('/admin/transactions')) return previewTransactions as T;

  if (path.startsWith('/admin/users/')) {
    const id = path.split('/')[3];
    const user = previewUsers.find((item) => item.id === id) ?? previewUsers[0];
    const userTransactions = previewTransactions.filter((item) => item.userId === user.id);
    return {
      ...user,
      wallets: [{ id: 'wallet-01', label: 'Wallet principal', crypto: 'USDT', network: 'TRC20', address: 'TQx9a8cDeFghiJKLmNoPqRsTuVwXyZ0123M' }, { id: 'wallet-02', label: 'Wallet BTC', crypto: 'BTC', network: 'BTC', address: 'bc1q8t8h3h6g2v9f0c8su8agw3k2k3v8c7l2e0q4pa' }],
      momoMethods: [{ id: 'momo-01', operatorName: 'MTN Mobile Money', phoneNumber: user.phone ?? '+237 600 000 000', isDefault: true }, { id: 'momo-02', operatorName: 'Orange Money', phoneNumber: user.phone ?? '+237 600 000 000', isDefault: false }],
      transactions: userTransactions,
      adminNotes: [{ id: 'note-01', note: 'Client actif : donnees fictives pour la demonstration.', createdAt: '2026-08-25T10:00:00.000Z', admin: { email: 'operations@jaltrade.com' } }, { id: 'note-02', note: 'Verification de profil disponible dans la file KYC.', createdAt: '2026-08-23T14:20:00.000Z', admin: { email: 'support@jaltrade.com' } }],
      summary: { transactionCount: user.transactionCount, achatCount: userTransactions.filter((item) => item.type === 'achat').length, venteCount: userTransactions.filter((item) => item.type === 'vente').length, totalVolume: Number(user.totalVolume), averageVolume: Math.round(Number(user.totalVolume) / Math.max(user.transactionCount, 1)), lastActivityAt: user.lastActivityAt },
    } as T;
  }
  if (path.startsWith('/admin/users')) return previewUsers as T;

  const previewKyc = [
    { id: 'kyc-001', userId: 'usr-sn-002', countryOfResidence: 'Senegal', nationality: 'Senegal', documentType: 'Passeport', frontDocRef: 'preview://kyc/kyc-001/front', backDocRef: null, selfieRef: 'preview://kyc/kyc-001/selfie', status: 'PENDING', riskLevel: 'MEDIUM', rejectionReason: null, createdAt: '2026-08-25T10:30:00.000Z', user: { ...previewUserIdentity('usr-sn-002'), createdAt: previewUsers[1].createdAt } },
    { id: 'kyc-002', userId: 'usr-gh-006', countryOfResidence: 'Ghana', nationality: 'Ghana', documentType: 'National ID', frontDocRef: 'preview://kyc/kyc-002/front', backDocRef: 'preview://kyc/kyc-002/back', selfieRef: 'preview://kyc/kyc-002/selfie', status: 'PENDING', riskLevel: 'HIGH', rejectionReason: null, createdAt: '2026-08-25T09:40:00.000Z', user: { ...previewUserIdentity('usr-gh-006'), createdAt: previewUsers[5].createdAt } },
    { id: 'kyc-003', userId: 'usr-cm-001', countryOfResidence: 'Cameroun', nationality: 'Cameroun', documentType: 'Carte nationale', frontDocRef: 'preview://kyc/kyc-003/front', backDocRef: 'preview://kyc/kyc-003/back', selfieRef: 'preview://kyc/kyc-003/selfie', status: 'APPROVED', riskLevel: 'LOW', rejectionReason: null, createdAt: '2026-08-24T13:00:00.000Z', user: { ...previewUserIdentity('usr-cm-001'), createdAt: previewUsers[0].createdAt } },
    { id: 'kyc-004', userId: 'usr-ci-003', countryOfResidence: "Cote d'Ivoire", nationality: "Cote d'Ivoire", documentType: 'Permis de conduire', frontDocRef: 'preview://kyc/kyc-004/front', backDocRef: 'preview://kyc/kyc-004/back', selfieRef: 'preview://kyc/kyc-004/selfie', status: 'APPROVED', riskLevel: 'LOW', rejectionReason: null, createdAt: '2026-08-23T14:00:00.000Z', user: { ...previewUserIdentity('usr-ci-003'), createdAt: previewUsers[2].createdAt } },
    { id: 'kyc-005', userId: 'usr-cd-004', countryOfResidence: 'RD Congo', nationality: 'RD Congo', documentType: 'Carte nationale', frontDocRef: 'preview://kyc/kyc-005/front', backDocRef: null, selfieRef: 'preview://kyc/kyc-005/selfie', status: 'REJECTED', riskLevel: 'HIGH', rejectionReason: 'Document illisible dans cet exemple de demonstration.', createdAt: '2026-08-22T12:10:00.000Z', user: { ...previewUserIdentity('usr-cd-004'), createdAt: previewUsers[3].createdAt } },
    { id: 'kyc-006', userId: 'usr-ml-005', countryOfResidence: 'Mali', nationality: 'Mali', documentType: 'Passeport', frontDocRef: 'preview://kyc/kyc-006/front', backDocRef: null, selfieRef: 'preview://kyc/kyc-006/selfie', status: 'PENDING', riskLevel: 'HIGH', rejectionReason: null, createdAt: '2026-08-21T09:20:00.000Z', user: { ...previewUserIdentity('usr-ml-005'), createdAt: previewUsers[4].createdAt } },
  ];
  if (path.startsWith('/admin/kyc/submissions/')) return (previewKyc.find((item) => item.id === path.split('/')[4]) ?? previewKyc[0]) as T;
  if (path.startsWith('/admin/kyc/submissions')) {
    const tab = new URLSearchParams(path.split('?')[1] ?? '').get('tab');
    const rows = tab === 'approved' ? previewKyc.filter((item) => item.status === 'APPROVED') : tab === 'rejected' ? previewKyc.filter((item) => item.status === 'REJECTED') : tab === 'manual_review' ? previewKyc.filter((item) => item.status === 'PENDING' && item.riskLevel === 'HIGH') : previewKyc.filter((item) => item.status === 'PENDING');
    return rows as T;
  }

  const previewCountries = [
    { id: 'country-cm', name: 'Cameroun', code: 'CM', currency: 'XAF', timezone: 'Africa/Douala', kycRequired: true, status: 'ACTIVE', minAmount: '500', maxAmount: '2000000', dailyMax: '5000000', description: 'Pays actif - donnees de demonstration.', paymentMethods: [{ id: 'cm-mtn', name: 'MTN Mobile Money', type: 'MOBILE_MONEY', feePct: '1.2', active: true }, { id: 'cm-orange', name: 'Orange Money', type: 'MOBILE_MONEY', feePct: '1.2', active: true }, { id: 'cm-express', name: 'Express Union Mobile', type: 'MOBILE_MONEY', feePct: '1.5', active: true }] },
    { id: 'country-sn', name: 'Senegal', code: 'SN', currency: 'XOF', timezone: 'Africa/Dakar', kycRequired: true, status: 'ACTIVE', minAmount: '500', maxAmount: '3000000', dailyMax: '6000000', description: 'Pays actif - donnees de demonstration.', paymentMethods: [{ id: 'sn-orange', name: 'Orange Money', type: 'MOBILE_MONEY', feePct: '1.0', active: true }, { id: 'sn-wave', name: 'Wave', type: 'MOBILE_MONEY', feePct: '0.8', active: true }, { id: 'sn-free', name: 'Free Money', type: 'MOBILE_MONEY', feePct: '1.0', active: true }] },
    { id: 'country-ci', name: "Cote d'Ivoire", code: 'CI', currency: 'XOF', timezone: 'Africa/Abidjan', kycRequired: true, status: 'ACTIVE', minAmount: '500', maxAmount: '3000000', dailyMax: '6000000', description: 'Pays actif - donnees de demonstration.', paymentMethods: [{ id: 'ci-orange', name: 'Orange Money', type: 'MOBILE_MONEY', feePct: '1.0', active: true }, { id: 'ci-mtn', name: 'MTN Money', type: 'MOBILE_MONEY', feePct: '1.1', active: true }, { id: 'ci-moov', name: 'Moov Money', type: 'MOBILE_MONEY', feePct: '1.1', active: true }] },
    { id: 'country-ml', name: 'Mali', code: 'ML', currency: 'XOF', timezone: 'Africa/Bamako', kycRequired: true, status: 'ACTIVE', minAmount: '500', maxAmount: '2000000', dailyMax: '4000000', description: 'Pays actif - donnees de demonstration.', paymentMethods: [{ id: 'ml-orange', name: 'Orange Money', type: 'MOBILE_MONEY', feePct: '1.1', active: true }, { id: 'ml-moov', name: 'Moov Money', type: 'MOBILE_MONEY', feePct: '1.2', active: true }] },
    { id: 'country-cd', name: 'RD Congo', code: 'CD', currency: 'CDF', timezone: 'Africa/Kinshasa', kycRequired: true, status: 'ACTIVE', minAmount: '1000', maxAmount: '5000000', dailyMax: '9000000', description: 'Pays actif - donnees de demonstration.', paymentMethods: [{ id: 'cd-mpesa', name: 'M-Pesa', type: 'MOBILE_MONEY', feePct: '1.5', active: true }, { id: 'cd-airtel', name: 'Airtel Money', type: 'MOBILE_MONEY', feePct: '1.5', active: true }, { id: 'cd-orange', name: 'Orange Money', type: 'MOBILE_MONEY', feePct: '1.6', active: true }] },
    { id: 'country-gh', name: 'Ghana', code: 'GH', currency: 'GHS', timezone: 'Africa/Accra', kycRequired: true, status: 'ACTIVE', minAmount: '10', maxAmount: '30000', dailyMax: '60000', description: 'Pays actif - donnees de demonstration.', paymentMethods: [{ id: 'gh-mtn', name: 'MTN MoMo', type: 'MOBILE_MONEY', feePct: '1.0', active: true }, { id: 'gh-telecel', name: 'Telecel Cash', type: 'MOBILE_MONEY', feePct: '1.3', active: true }, { id: 'gh-airtel', name: 'AirtelTigo Money', type: 'MOBILE_MONEY', feePct: '1.2', active: true }] },
    { id: 'country-bj', name: 'Benin', code: 'BJ', currency: 'XOF', timezone: 'Africa/Porto-Novo', kycRequired: true, status: 'ACTIVE', minAmount: '500', maxAmount: '1500000', dailyMax: '3000000', description: 'Pays actif - donnees de demonstration.', paymentMethods: [{ id: 'bj-mtn', name: 'MTN MoMo', type: 'MOBILE_MONEY', feePct: '1.1', active: true }, { id: 'bj-moov', name: 'Moov Money', type: 'MOBILE_MONEY', feePct: '1.1', active: true }] },
    { id: 'country-bf', name: 'Burkina Faso', code: 'BF', currency: 'XOF', timezone: 'Africa/Ouagadougou', kycRequired: true, status: 'MAINTENANCE', minAmount: '500', maxAmount: '1500000', dailyMax: '3000000', description: 'Maintenance planifiee - demonstration.', paymentMethods: [{ id: 'bf-orange', name: 'Orange Money', type: 'MOBILE_MONEY', feePct: '1.2', active: true }, { id: 'bf-moov', name: 'Moov Money', type: 'MOBILE_MONEY', feePct: '1.2', active: false }] },
  ];
  if (path.startsWith('/admin/countries/')) return (previewCountries.find((item) => item.id === path.split('/')[3]) ?? previewCountries[0]) as T;
  if (path === '/admin/countries') return previewCountries as T;

  const previewPricing = [
    { id: 'pricing-cm-usdt-buy', country: 'CM', crypto: 'USDT', direction: 'achat', marginPct: '1.50', marginMinPct: '1.00', marginMaxPct: '2.25', feeFixed: '500', active: true },
    { id: 'pricing-cm-usdt-sell', country: 'CM', crypto: 'USDT', direction: 'vente', marginPct: '1.30', marginMinPct: '1.00', marginMaxPct: '2.00', feeFixed: '500', active: true },
    { id: 'pricing-sn-usdt-buy', country: 'SN', crypto: 'USDT', direction: 'achat', marginPct: '1.45', marginMinPct: '1.00', marginMaxPct: '2.00', feeFixed: '400', active: true },
    { id: 'pricing-ci-btc-buy', country: 'CI', crypto: 'BTC', direction: 'achat', marginPct: '1.80', marginMinPct: '1.20', marginMaxPct: '2.60', feeFixed: '750', active: true },
    { id: 'pricing-ci-btc-sell', country: 'CI', crypto: 'BTC', direction: 'vente', marginPct: '1.60', marginMinPct: '1.20', marginMaxPct: '2.40', feeFixed: '750', active: true },
    { id: 'pricing-cd-usdt-buy', country: 'CD', crypto: 'USDT', direction: 'achat', marginPct: '2.10', marginMinPct: '1.50', marginMaxPct: '3.00', feeFixed: '1000', active: true },
    { id: 'pricing-gh-usdt-buy', country: 'GH', crypto: 'USDT', direction: 'achat', marginPct: '1.70', marginMinPct: '1.10', marginMaxPct: '2.40', feeFixed: '5', active: true },
    { id: 'pricing-default-eth', country: null, crypto: 'ETH', direction: null, marginPct: '2.00', marginMinPct: '1.50', marginMaxPct: '3.00', feeFixed: '0', active: false },
  ];
  if (path.startsWith('/admin/pricing/quotes/compare')) return [{ provider: 'Yellow Card Liquidity', providerRate: 648.2, fees: 0.85, error: null }, { provider: 'PayDunya West Africa', providerRate: 650.1, fees: 1.1, error: null }, { provider: 'Demo reserve provider', providerRate: null, fees: null, error: 'Indisponible dans cet apercu' }] as T;
  if (path.startsWith('/admin/pricing/breakdown')) return { providerRate: '648.20', marginPct: '1.50', feeFixed: '500.00', jalRateClient: '657.92' } as T;
  if (path.startsWith('/admin/pricing/rate-history')) return [{ date: '2026-08-19', providerRate: 642.8, clientRate: 652.4 }, { date: '2026-08-20', providerRate: 645.1, clientRate: 654.8 }, { date: '2026-08-21', providerRate: 643.6, clientRate: 653.3 }, { date: '2026-08-22', providerRate: 647.2, clientRate: 656.9 }, { date: '2026-08-23', providerRate: 648.5, clientRate: 658.2 }, { date: '2026-08-24', providerRate: 646.9, clientRate: 656.6 }, { date: '2026-08-25', providerRate: 648.2, clientRate: 657.9 }] as T;
  if (path === '/admin/pricing') return previewPricing as T;

  const previewTickets = [
    { id: 'ticket-001', userId: 'usr-sn-002', subject: 'Paiement Wave en attente', jalTransactionId: 'JAL-2026-B4V1-77Q', status: 'IN_PROGRESS', description: 'Le paiement est affiche en attente dans ce jeu de donnees fictif.', createdAt: '2026-08-25T12:35:00.000Z', updatedAt: '2026-08-25T13:15:00.000Z', user: previewUserIdentity('usr-sn-002'), notes: [{ id: 'ticket-note-01', authorId: 'preview-support', note: 'Demande transferee aux operations.', createdAt: '2026-08-25T13:15:00.000Z' }] },
    { id: 'ticket-002', userId: 'usr-cd-004', subject: 'Transaction a verifier', jalTransactionId: 'JAL-2026-F1H8-65T', status: 'ESCALATED', description: 'Une verification du fournisseur Mobile Money est requise.', createdAt: '2026-08-24T17:10:00.000Z', updatedAt: '2026-08-25T08:05:00.000Z', user: previewUserIdentity('usr-cd-004'), notes: [{ id: 'ticket-note-02', authorId: 'preview-operations', note: 'Escalade operationnelle fictive.', createdAt: '2026-08-25T08:05:00.000Z' }] },
    { id: 'ticket-003', userId: 'usr-cm-001', subject: 'Question sur le reseau TRC20', jalTransactionId: 'JAL-2026-A8K2-91M', status: 'RESOLVED', description: 'Le client a recu les informations de reseau.', createdAt: '2026-08-23T14:05:00.000Z', updatedAt: '2026-08-23T15:10:00.000Z', user: previewUserIdentity('usr-cm-001'), notes: [{ id: 'ticket-note-03', authorId: 'preview-support', note: 'Reponse envoyee.', createdAt: '2026-08-23T15:10:00.000Z' }] },
    { id: 'ticket-004', userId: 'usr-gh-006', subject: 'Verification de numero', jalTransactionId: null, status: 'OPEN', description: 'Le client demande une aide de connexion.', createdAt: '2026-08-25T09:45:00.000Z', updatedAt: '2026-08-25T09:45:00.000Z', user: previewUserIdentity('usr-gh-006'), notes: [] },
  ];
  if (path.startsWith('/admin/support/tickets/')) return (previewTickets.find((item) => item.id === path.split('/')[4]) ?? previewTickets[0]) as T;
  if (path.startsWith('/admin/support/clients/')) {
    const user = previewUsers.find((item) => item.id === path.split('/')[4]) ?? previewUsers[0];
    return { ...user, wallets: [{ id: 'wallet-client', label: 'Wallet USDT', crypto: 'USDT' }], momoMethods: [{ id: 'momo-client', operatorName: 'MTN Mobile Money', phoneNumber: user.phone }], transactions: previewTransactions.filter((item) => item.userId === user.id), supportTickets: previewTickets.filter((item) => item.userId === user.id) } as T;
  }
  if (path.startsWith('/admin/support/tickets')) return previewTickets as T;

  if (path === '/admin/auth/sessions') return [
    { id: 'session-preview-01', userAgent: 'Chrome 139 / Windows 11', ipAddress: '203.0.113.10', createdAt: '2026-08-25T08:00:00.000Z', lastSeenAt: '2026-08-25T14:10:00.000Z' },
    { id: 'session-preview-02', userAgent: 'Safari / iPhone', ipAddress: '198.51.100.24', createdAt: '2026-08-24T16:20:00.000Z', lastSeenAt: '2026-08-24T17:05:00.000Z' },
    { id: 'session-preview-03', userAgent: 'Firefox / Ubuntu', ipAddress: '192.0.2.45', createdAt: '2026-08-22T12:00:00.000Z', lastSeenAt: '2026-08-22T12:40:00.000Z' },
  ] as T;
  if (path.startsWith('/admin/settings/activity-logs')) return [
    { id: 'log-001', actionType: 'TRANSACTION_REVIEWED', jalTransactionId: 'JAL-2026-F1H8-65T', justification: 'Controle manuel de demonstration', performedAt: '2026-08-25T13:30:00.000Z', ipAddress: '203.0.113.10', admin: { email: 'operations@jaltrade.com', role: 'OPERATIONS' } },
    { id: 'log-002', actionType: 'KYC_APPROVED', jalTransactionId: null, justification: 'Documents conformes dans la demo', performedAt: '2026-08-25T11:00:00.000Z', ipAddress: '203.0.113.10', admin: { email: 'operations@jaltrade.com', role: 'OPERATIONS' } },
    { id: 'log-003', actionType: 'ROUTING_UPDATED', jalTransactionId: null, justification: 'Priorite fournisseur ajustee', performedAt: '2026-08-24T15:00:00.000Z', ipAddress: '198.51.100.24', admin: { email: 'demo@jaltrade.com', role: 'ADMIN_SYSTEM' } },
  ] as T;

  if (/^\/admin\/(transactions|users|kyc\/submissions|providers|pricing|countries|support\/tickets|auth\/sessions|settings\/activity-logs)/.test(path)) {
    return [] as T;
  }
  return {} as T;
}

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
  if (isPreviewMode) return session.accessToken;
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
  if (isPreviewMode) return previewResponse<T>(path, options);
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
const put = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') search.set(k, String(v));
  const s = search.toString();
  return s ? `?${s}` : '';
}

/** For file-download endpoints (CSV export) — bypasses the JSON `request()` path. */
async function downloadFile(path: string, filename: string) {
  if (isPreviewMode) {
    window.alert('Aperçu visuel : le téléchargement est disponible dans la version connectée au backend.');
    return;
  }
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
  visibleName: string | null;
  supportedCountries: string[];
  supportedCryptos: string[];
  supportedNetworks: string[];
  active: boolean;
  priority: number;
  minimumPayment: string | null;
  maximumPayment: string | null;
  notes: string | null;
  health: { status: 'UP' | 'DEGRADED' | 'DOWN'; avgLatencyMs: number | null; successRateWindow: number | null; lastCheckAt: string | null } | null;
}

export interface MomoProviderConfig {
  id: string;
  name: string;
  visibleName: string | null;
  countries: string[];
  active: boolean;
  minimumPayment: string | null;
  maximumPayment: string | null;
  notes: string | null;
}

/** Unified crypto + Mobile Money row for the Payment Providers admin table — see backend/src/payment-providers/payment-providers.service.ts. */
export interface PaymentProviderRow {
  kind: 'crypto' | 'momo';
  id: string;
  name: string;
  visibleName: string | null;
  active: boolean;
  balance: number | null;
  balanceCurrency: string | null;
  balanceStatus: 'AVAILABLE' | 'UNAVAILABLE';
  balanceUpdatedAt: string | null;
  averageTimeMs: number | null;
  healthStatus: 'UP' | 'DEGRADED' | 'DOWN' | null;
  minimumPayment: number | null;
  maximumPayment: number | null;
  hasApiKeyConfigured: boolean;
  callbackPath: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
  if (isPreviewMode) {
    setSession(previewAdminSession);
    return previewAdminSession;
  }
  const result = await post<{ adminId: string; role: 'SUPPORT' | 'OPERATIONS' | 'FINANCE' | 'ADMIN_SYSTEM'; permissions: AdminPermission[]; accessToken: string; refreshToken: string }>(
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

export interface BackofficeAdmin {
  id: string;
  email: string;
  displayName: string | null;
  role: 'SUPPORT' | 'OPERATIONS' | 'FINANCE' | 'ADMIN_SYSTEM';
  isActive: boolean;
  permissions: AdminPermission[];
  permissionsConfigured: boolean;
  createdAt: string;
  updatedAt: string;
}

export const adminUsersApi = {
  list: () => get<BackofficeAdmin[]>('/admin/admin-users'),
  create: (input: { email: string; password: string; role: BackofficeAdmin['role']; displayName?: string; permissions?: AdminPermission[] }) => post<BackofficeAdmin>('/admin/admin-users', input),
  update: (id: string, input: { role?: BackofficeAdmin['role']; displayName?: string; permissions?: AdminPermission[] }) => patch<BackofficeAdmin>(`/admin/admin-users/${id}`, input),
  setActive: (id: string, isActive: boolean) => patch<BackofficeAdmin>(`/admin/admin-users/${id}/status`, { isActive }),
  resetPassword: (id: string, temporaryPassword: string) => post<{ id: string; passwordReset: boolean }>(`/admin/admin-users/${id}/password-reset`, { temporaryPassword }),
  /** Authoritative role → selectable-permissions map, straight from the backend's PERMISSION_MATRIX — never hand-copied. */
  permissionMatrix: () => get<Record<BackofficeAdmin['role'], AdminPermission[]>>('/admin/admin-users/permission-matrix'),
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboardApi = {
  summary: (range?: { startDate: string; endDate: string }) =>
    get<{
      range: { startDate: string; endDate: string }; comparisonRange: { startDate: string; endDate: string };
      volume: string; volumeToday: string; volumeChangePct: number | null; transactionsCount: number; transactionsToday: number; achatCount: number; venteCount: number;
      transactionsChangePct: number | null; grossMargin: string; grossMarginChangePct: number | null; netResultEstimate: string;
      netResultChangePct: number | null; activeUsers: number; kycPending: number; blockedTransactions: number; errorRatePct: number;
    }>(`/admin/dashboard/summary${qs(range ?? {})}`),
  charts: (range: { startDate: string; endDate: string }) =>
    get<{
      range: { startDate: string; endDate: string };
      volumeSeries: Array<{ date: string; volume: string }>;
      achatVsVente: { achat: number; vente: number; total: number };
      byCountry: Array<{ key: string; count: number; pct: number }>;
      byProvider: Array<{ key: string; count: number; pct: number }>;
      byCrypto: Array<{ key: string; volume: string; pct: number }>;
    }>(`/admin/dashboard/charts${qs(range)}`),
  acquisition: (range: { startDate: string; endDate: string }) =>
    get<{
      range: { startDate: string; endDate: string };
      totalRegistrations: number;
      totalActivatedUsers: number;
      sources: Array<{
        source: 'REFERRAL' | 'PAID_ADS' | 'SOCIAL_MEDIA' | 'AMBASSADOR_OR_PROMO' | 'WEB_OR_OTHER' | 'NOT_RECORDED';
        registrations: number;
        sharePct: number;
        activeUsers: number;
        activationRatePct: number;
      }>;
    }>(`/admin/dashboard/acquisition${qs(range)}`),
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

export interface CreateProviderInput {
  name: string;
  visibleName?: string;
  supportedCountries: string[];
  supportedCryptos: string[];
  supportedNetworks: string[];
  priority?: number;
  minimumPayment?: number;
  maximumPayment?: number;
  notes?: string;
}

export const providersApi = {
  list: () => get<ProviderConfig[]>('/admin/providers'),
  detail: (id: string) => get<ProviderConfig>(`/admin/providers/${id}`),
  testConnections: () => post<Array<{ providerId: string; name: string; status: string; latencyMs: number | null; error: string | null }>>('/admin/providers/test-connections'),
  create: (input: CreateProviderInput) => post('/admin/providers', input),
  update: (id: string, input: Partial<Omit<CreateProviderInput, 'name'>>) => patch(`/admin/providers/${id}`, input),
  toggle: (id: string, active: boolean) => patch(`/admin/providers/${id}/toggle`, { active }),
};

// ---------------------------------------------------------------------------
// Mobile Money providers (Payment Providers admin — momo side)
// ---------------------------------------------------------------------------

export interface CreateMomoProviderInput {
  name: string;
  visibleName?: string;
  countries?: string[];
  active?: boolean;
  minimumPayment?: number;
  maximumPayment?: number;
  notes?: string;
}

export const momoProvidersApi = {
  list: () => get<MomoProviderConfig[]>('/admin/momo-providers'),
  detail: (id: string) => get<MomoProviderConfig>(`/admin/momo-providers/${id}`),
  create: (input: CreateMomoProviderInput) => post('/admin/momo-providers', input),
  update: (id: string, input: Partial<Omit<CreateMomoProviderInput, 'name'>>) => patch(`/admin/momo-providers/${id}`, input),
  toggle: (id: string, active: boolean) => patch(`/admin/momo-providers/${id}/toggle`, { active }),
};

// ---------------------------------------------------------------------------
// Payment Providers — unified admin view (Provider / Balance / Average Time)
// ---------------------------------------------------------------------------

export const paymentProvidersApi = {
  list: (search?: string, sort?: 'balance') => get<PaymentProviderRow[]>(`/admin/payment-providers${qs({ search, sort })}`),
  refreshBalance: (kind: 'crypto' | 'momo', id: string) => post<PaymentProviderRow>(`/admin/payment-providers/${kind}/${id}/refresh-balance`),
  refreshAll: () => post('/admin/payment-providers/refresh-all'),
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
    get<{ revenueTotal: string; commissions: string; feesAndCharges: string; netProfit: string }>(`/admin/finance/summary${qs({ dateFrom, dateTo })}`),
  periodBreakdown: (dateFrom: string, dateTo: string) =>
    get<Array<{ date: string; revenueTotal: string; commissions: string; feesAndCharges: string; netProfit: string; marginPct: string }>>(`/admin/finance/period-breakdown${qs({ dateFrom, dateTo })}`),
  export: (dateFrom?: string, dateTo?: string) => downloadFile(`/admin/finance/export${qs({ dateFrom, dateTo })}`, 'jal-trade-finance.csv'),
};

// ---------------------------------------------------------------------------
// Referral & promotional programmes (non-custodial growth ledger)
// ---------------------------------------------------------------------------

export interface ReferralProgramConfig {
  id: string;
  enabled: boolean;
  minimumFiatAmount: string | null;
  rewardType: 'FIXED_FIAT' | 'PERCENT_OF_JAL_MARGIN';
  rewardValue: string;
  rewardCurrency: string | null;
  requiresKycApproval: boolean;
  firstCompletedTransaction: boolean;
  updatedAt: string;
}

export interface PromoCampaign {
  id: string;
  code: string;
  name: string;
  description: string | null;
  benefitType: 'MARGIN_DISCOUNT_PERCENT';
  benefitValue: string;
  active: boolean;
  minimumFiatAmount: string | null;
  maximumRedemptions: number | null;
  redemptionsReserved: number;
  newUsersOnly: boolean;
  firstCompletedTransaction: boolean;
  countries: string[];
  cryptos: string[];
  startsAt: string;
  endsAt: string;
  ambassadorApplicationId?: string | null;
  _count?: { redemptions: number };
}

export interface AmbassadorProgramConfig {
  id: string;
  enabled: boolean;
  promoBenefitValue: string;
  promoMinimumFiatAmount: string | null;
  promoMaximumRedemptions: number | null;
  promoNewUsersOnly: boolean;
  promoFirstCompletedTransaction: boolean;
  promoDurationDays: number;
  updatedAt: string;
}

export interface AmbassadorApplication {
  id: string;
  displayName: string;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  telegramUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: string; email: string | null; phone: string | null; country: string; kycStatus: string };
  promoCampaign: { id: string; code: string; active: boolean; redemptionsReserved: number; endsAt: string } | null;
}

export interface GrowthReferral {
  id: string;
  status: 'PENDING' | 'QUALIFIED' | 'DISQUALIFIED';
  codeSnapshot: string;
  createdAt: string;
  referrer: { id: string; email: string | null; phone: string | null; country: string };
  referredUser: { id: string; email: string | null; phone: string | null; country: string; kycStatus: string };
  reward: { id: string; calculatedAmount: string; currency: string; status: 'PENDING' | 'APPROVED' | 'SETTLED' | 'CANCELLED' } | null;
}

export interface GrowthReward {
  id: string;
  calculatedAmount: string;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'SETTLED' | 'CANCELLED';
  createdAt: string;
  settlementReference: string | null;
  referral: { referrer: { email: string | null; phone: string | null }; referredUser: { email: string | null; phone: string | null } };
}

export const growthApi = {
  referralProgram: () => get<ReferralProgramConfig | null>('/admin/growth/referral-program'),
  updateReferralProgram: (input: { enabled: boolean; minimumFiatAmount?: number; rewardType: ReferralProgramConfig['rewardType']; rewardValue: number; rewardCurrency?: string; requiresKycApproval: boolean; firstCompletedTransaction: boolean }) =>
    put<ReferralProgramConfig>('/admin/growth/referral-program', input),
  ambassadorProgram: () => get<AmbassadorProgramConfig | null>('/admin/growth/ambassador-program'),
  updateAmbassadorProgram: (input: { enabled: boolean; promoBenefitValue: number; promoMinimumFiatAmount?: number; promoMaximumRedemptions?: number; promoNewUsersOnly: boolean; promoFirstCompletedTransaction: boolean; promoDurationDays: number }) =>
    put<AmbassadorProgramConfig>('/admin/growth/ambassador-program', input),
  ambassadorApplications: () => get<AmbassadorApplication[]>('/admin/growth/ambassador-applications'),
  approveAmbassadorApplication: (id: string) => post(`/admin/growth/ambassador-applications/${id}/approve`),
  rejectAmbassadorApplication: (id: string, reason: string) => post(`/admin/growth/ambassador-applications/${id}/reject`, { reason }),
  referrals: () => get<GrowthReferral[]>('/admin/growth/referrals'),
  rewards: () => get<GrowthReward[]>('/admin/growth/rewards'),
  approveReward: (id: string) => post(`/admin/growth/rewards/${id}/approve`),
  settleReward: (id: string, input: { settlementReference: string; justification: string }) => post(`/admin/growth/rewards/${id}/settle`, input),
  promotions: () => get<PromoCampaign[]>('/admin/growth/promotions'),
  createPromotion: (input: Omit<PromoCampaign, 'id' | 'redemptionsReserved' | '_count' | 'benefitValue' | 'minimumFiatAmount'> & { benefitValue: number; minimumFiatAmount?: number }) => post<PromoCampaign>('/admin/growth/promotions', input),
  updatePromotion: (id: string, input: Partial<PromoCampaign>) => patch<PromoCampaign>(`/admin/growth/promotions/${id}`, input),
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
