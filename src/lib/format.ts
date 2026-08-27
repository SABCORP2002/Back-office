/** The real API returns raw decimal strings (e.g. "125430000"), not the pre-formatted "125 430 000 XAF" the mock data had. */
export function formatAmount(value: string | number, currency?: string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatPct(value: number | null | undefined, opts: { sign?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = opts.sign !== false && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}
