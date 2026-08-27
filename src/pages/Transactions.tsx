import { useCallback, useEffect, useState } from 'react';
import { Repeat, Download, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, Button, Select, SearchInput, Pagination } from '../components/ui';
import { Badge } from '../components/Badge';
import { transactionsApi, providersApi, countriesApi, type Transaction, type TxStatus } from '../lib/api';
import { TX_STATUS_LABELS, TX_STATUS_TONE } from '../lib/statusLabels';
import { formatAmount, formatDateTime } from '../lib/format';
import { hasPermission } from '../lib/auth';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const canExport = hasPermission('EXPORT_TRANSACTIONS');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [providerId, setProviderId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [providerOptions, setProviderOptions] = useState<{ id: string; name: string }[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    transactionsApi
      .list({ status: status || undefined, providerId: providerId || undefined, country: country || undefined })
      .then(setTransactions)
      .catch(() => setError(true));
  }, [status, providerId, country]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (hasPermission('VIEW_PROVIDERS')) providersApi.list().then((rows) => setProviderOptions(rows.map((p) => ({ id: p.id, name: p.name }))));
    if (hasPermission('VIEW_COUNTRIES_PAYMENTS')) countriesApi.list().then((rows) => setCountryOptions(rows.map((c) => c.name)));
  }, []);

  const filtered = (transactions ?? []).filter((t) => {
    if (type && t.type !== type) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!t.jalTransactionId.toLowerCase().includes(s) && !(t.user.phone ?? t.user.email ?? '').toLowerCase().includes(s)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Screen>
      <PageHeader
        icon={Repeat}
        title="Transactions"
        subtitle="Gérez et suivez toutes les transactions d'achat et de vente."
        action={canExport ? <Button variant="primary" icon={Download} onClick={() => transactionsApi.export({ status: status || undefined, providerId: providerId || undefined, country: country || undefined })}>Exporter</Button> : undefined}
      />

      {error && (
        <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          Impossible de contacter le serveur backend.
        </div>
      )}

      <Card className="mb-4">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <div className="mb-1 text-xs text-onSurfaceVariant">Type</div>
            <Select value={type} onChange={(v) => { setType(v); setPage(1); }} options={['achat', 'vente']} placeholder="Tous" className="w-full" />
          </div>
          <div>
            <div className="mb-1 text-xs text-onSurfaceVariant">Statut</div>
            <Select
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={(Object.keys(TX_STATUS_LABELS) as TxStatus[]).map((s) => ({ value: s, label: TX_STATUS_LABELS[s] }))}
              placeholder="Tous"
              className="w-full"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-onSurfaceVariant">Pays</div>
            <Select value={country} onChange={(v) => { setCountry(v); setPage(1); }} options={countryOptions} placeholder="Tous" className="w-full" />
          </div>
          <div>
            <div className="mb-1 text-xs text-onSurfaceVariant">Fournisseur</div>
            <Select
              value={providerId}
              onChange={(v) => { setProviderId(v); setPage(1); }}
              options={providerOptions.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Tous"
              className="w-full"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-onSurfaceVariant">&nbsp;</div>
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} className="w-full" placeholder="JAL ID, téléphone, email..." />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Button variant="ghost" icon={RotateCcw} onClick={() => { setType(''); setStatus(''); setCountry(''); setProviderId(''); setSearch(''); setPage(1); }}>Réinitialiser</Button>
          <span className="text-sm text-onSurfaceVariant">{filtered.length} transactions trouvées</span>
        </div>
      </Card>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                {['ID JAL', 'Utilisateur', 'Pays', 'Type', 'Crypto', 'Montant crypto', 'Montant fiat', 'Fournisseur', 'Taux client', 'Marge JAL', 'Statut', 'Date'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((t) => (
                <tr key={t.jalTransactionId} className="border-b border-border/60 hover:bg-surface-higher/40">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-primary">{t.jalTransactionId}</td>
                  <td className="whitespace-nowrap px-4 py-3">{t.user.phone ?? t.user.email ?? t.userId}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{t.user.country}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${t.type === 'achat' ? 'text-success' : 'text-error'}`}>
                      {t.type === 'achat' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                      {t.type === 'achat' ? 'Achat' : 'Vente'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{t.crypto}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatAmount(t.cryptoAmountExpected)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatAmount(t.fiatAmountExpected)} {t.fiatCurrency}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{t.provider?.name ?? '— (routage non exécuté)'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{t.jalRateLocked}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{formatAmount(t.jalMargin)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={TX_STATUS_TONE[t.status as TxStatus]}>{TX_STATUS_LABELS[t.status as TxStatus]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
              {pageItems.length === 0 && transactions !== null && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-onSurfaceVariant">Aucune transaction ne correspond à ces filtres.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </Card>
    </Screen>
  );
}
