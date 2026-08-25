import { useCallback, useEffect, useState } from 'react';
import { Globe, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, CardTitle, StatCard, Button, SearchInput, Toggle } from '../components/ui';
import { Badge } from '../components/Badge';
import { countriesApi, dashboardApi, transactionsApi, type Country } from '../lib/api';
import { formatAmount } from '../lib/format';

const STATUS_LABELS: Record<Country['status'], string> = { ACTIVE: 'Actif', MAINTENANCE: 'Maintenance', DISABLED: 'Désactivé' };
const STATUS_TONE: Record<Country['status'], 'success' | 'warning' | 'error'> = { ACTIVE: 'success', MAINTENANCE: 'warning', DISABLED: 'error' };

export default function PaysPaiementsPage() {
  const [search, setSearch] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof countriesApi.stats>> | null>(null);
  const [globalStats, setGlobalStats] = useState<Awaited<ReturnType<typeof dashboardApi.summary>> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [countrySummary, setCountrySummary] = useState<{ txCount: number; volume: number } | null>(null);
  const [newMethod, setNewMethod] = useState({ name: '', type: 'Mobile Money' });
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    countriesApi
      .list()
      .then((rows) => {
        setCountries(rows);
        if (!selectedId && rows[0]) setSelectedId(rows[0].id);
      })
      .catch(() => setError(true));
  }, [selectedId]);

  useEffect(() => {
    load();
    countriesApi.stats().then(setStats);
    dashboardApi.summary().then(setGlobalStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = countries.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    transactionsApi.list({ country: selected.name }).then((rows) => {
      setCountrySummary({ txCount: rows.length, volume: rows.reduce((a, t) => a + Number(t.fiatAmountExpected), 0) });
    });
  }, [selected]);

  const filtered = countries.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  async function addPaymentMethod() {
    if (!selected || !newMethod.name) return;
    await countriesApi.addPaymentMethod(selected.id, newMethod);
    setNewMethod({ name: '', type: 'Mobile Money' });
    load();
  }

  return (
    <Screen>
      <PageHeader icon={Globe} title="Pays & Paiements" subtitle="Gérez les pays disponibles, les devises, les moyens de paiement et les limites par transaction." />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <div className="mb-4 grid grid-cols-4 gap-4">
        <StatCard iconTone="info" label="Pays activés" value={stats?.activeCountries ?? '—'} suffix={stats ? `sur ${stats.totalCountries} pays` : ''} />
        <StatCard iconTone="success" label="Moyens de paiement actifs" value={stats?.activePaymentMethods ?? '—'} suffix={stats ? `sur ${stats.totalPaymentMethods} moyens` : ''} />
        <StatCard label="Volume aujourd'hui" value={globalStats ? formatAmount(globalStats.volumeToday) : '—'} suffix="XAF" />
        <StatCard iconTone="purple" label="Transactions aujourd'hui" value={globalStats?.transactionsToday ?? '—'} />
      </div>

      <div className="grid grid-cols-[1fr_420px] gap-4">
        <Card padded={false}>
          <div className="p-5 pb-3">
            <CardTitle>Liste des pays</CardTitle>
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un pays..." className="w-full" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                  {['Pays', 'Devise', 'Statut', 'Moyens de paiement', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`cursor-pointer border-b border-border/60 hover:bg-surface-higher/40 ${selectedId === c.id ? 'bg-surface-higher/60' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3">{c.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{c.currency}</td>
                    <td className="whitespace-nowrap px-4 py-3"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABELS[c.status]}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{c.paymentMethods.length}</td>
                    <td className="whitespace-nowrap px-4 py-3"><Pencil size={14} className="text-onSurfaceVariant" /></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-onSurfaceVariant">Aucun pays.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        {selected && (
          <Card className="h-fit">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold">{selected.name} <Badge tone={STATUS_TONE[selected.status]} dot>{STATUS_LABELS[selected.status]}</Badge></span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <Row label="Devise" value={selected.currency} />
                <Row label="Code" value={selected.code} />
                <Row label="Fuseau horaire" value={selected.timezone ?? '—'} />
                <Row label="KYC requis" value={selected.kycRequired ? 'Oui' : 'Non'} />
                <Row label="Statut" value={<Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>} />
              </div>
              <div className="rounded-md border border-border bg-surface-higher p-3 text-xs space-y-2">
                <div className="mb-1 font-semibold text-onSurfaceVariant">Limites</div>
                <Row label="Minimum" value={selected.minAmount ? formatAmount(selected.minAmount) : 'Non défini'} small />
                <Row label="Maximum" value={selected.maxAmount ? formatAmount(selected.maxAmount) : 'Non défini'} small />
                <Row label="Maximum journalier" value={selected.dailyMax ? formatAmount(selected.dailyMax) : 'Non défini'} small />
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 text-xs font-bold tracking-wide text-onSurfaceVariant">RÉSUMÉ DU PAYS (toutes transactions)</div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <MiniStat label="Transactions" value={countrySummary ? String(countrySummary.txCount) : '—'} />
                <MiniStat label="Volume" value={countrySummary ? formatAmount(countrySummary.volume) : '—'} />
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 text-xs font-bold tracking-wide text-onSurfaceVariant">MOYENS DE PAIEMENT</div>
              <div className="space-y-1.5">
                {selected.paymentMethods.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-md border border-border px-2.5 py-2 text-xs">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-onSurfaceVariant">{m.type}</span>
                    <Toggle checked={m.active} onChange={() => countriesApi.updatePaymentMethod(m.id, { active: !m.active }).then(load)} />
                    <button onClick={() => countriesApi.removePaymentMethod(m.id).then(load)} className="text-onSurfaceVariant hover:text-error"><Trash2 size={13} /></button>
                  </div>
                ))}
                {selected.paymentMethods.length === 0 && <div className="text-xs text-onSurfaceVariant">Aucun moyen de paiement.</div>}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={newMethod.name}
                  onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                  placeholder="Nom (ex. Orange Money)"
                  className="flex-1 rounded-md border border-border bg-surface-higher px-2 py-1.5 text-xs"
                />
                <Button icon={PlusCircle} onClick={addPaymentMethod} className="text-xs">Ajouter</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Screen>
  );
}

function Row({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${small ? 'text-xs' : ''}`}>
      <span className="text-onSurfaceVariant">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] text-onSurfaceVariant">{label}</div>
    </div>
  );
}
