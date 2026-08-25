import { useEffect, useState } from 'react';
import { Wallet, Download, Landmark, DollarSign, Cpu, Wand2, CalendarClock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, CardTitle, StatCard, Button } from '../components/ui';
import { Badge } from '../components/Badge';
import { financeApi } from '../lib/api';
import { formatAmount, formatDate } from '../lib/format';

type Summary = Awaited<ReturnType<typeof financeApi.summary>>;
type Breakdown = Awaited<ReturnType<typeof financeApi.periodBreakdown>>;
type Withdrawal = Awaited<ReturnType<typeof financeApi.withdrawals>>[number];

const WITHDRAWAL_TONE: Record<Withdrawal['status'], 'success' | 'warning' | 'error'> = { PAID: 'success', PENDING: 'warning', FAILED: 'error' };
const WITHDRAWAL_LABELS: Record<Withdrawal['status'], string> = { PAID: 'Payé', PENDING: 'En cours', FAILED: 'Échoué' };

/**
 * `commissions`/`netProfit` deliberately equal `revenueTotal` here — no
 * separate commission/cost ledger exists in the real schema (see
 * FinanceService's doc comment). The revenue-breakdown donut the mockup
 * shows with 4 slices is replaced by a single real category rather than
 * invented ones. "Imprimer"/"Planifier un rapport" had no real backing and
 * were dropped rather than left as dead buttons.
 */
export default function FinancePage() {
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    Promise.all([financeApi.summary(dateFrom, dateTo), financeApi.periodBreakdown(dateFrom, dateTo), financeApi.withdrawals()])
      .then(([s, b, w]) => {
        setSummary(s);
        setBreakdown(b);
        setWithdrawals(w);
      })
      .catch(() => setError(true));
  }

  useEffect(load, [dateFrom, dateTo]);

  async function requestWithdrawal() {
    const amount = window.prompt('Montant à retirer (XAF) :');
    if (!amount) return;
    const destination = window.prompt('Destination (compte bancaire) :') ?? '';
    const justification = window.prompt('Justification :') ?? '';
    if (!justification) return;
    await financeApi.requestWithdrawal(Number(amount), 'XAF', destination, justification);
    load();
  }

  const totals = breakdown.reduce(
    (acc, r) => ({ revenue: acc.revenue + Number(r.revenueTotal), fees: acc.fees + Number(r.feesAndCharges), net: acc.net + Number(r.netProfit) }),
    { revenue: 0, fees: 0, net: 0 },
  );

  return (
    <Screen
      topbarRight={
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurfaceVariant">
          <CalendarClock size={14} />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent outline-none" />
          –
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent outline-none" />
        </div>
      }
    >
      <PageHeader
        icon={Wallet}
        title="Finance & Rapports"
        subtitle="Suivez les performances financières et générez des rapports détaillés."
        action={<Button variant="primary" icon={Download} onClick={() => financeApi.export(dateFrom, dateTo)}>Exporter (CSV)</Button>}
      />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <div className="mb-4 grid grid-cols-4 gap-4">
        <StatCard icon={DollarSign} iconTone="success" label="Revenu total" value={summary ? formatAmount(summary.revenueTotal, 'XAF') : '—'} />
        <StatCard icon={Cpu} iconTone="info" label="Commissions" value={summary ? formatAmount(summary.commissions, 'XAF') : '—'} footer={<span className="text-onSurfaceVariant">= revenu total (pas de ledger de coûts distinct)</span>} />
        <StatCard icon={Wand2} iconTone="warning" label="Bénéfice net" value={summary ? formatAmount(summary.netProfit, 'XAF') : '—'} />
        <StatCard icon={Landmark} label="Solde disponible" value={summary ? formatAmount(summary.availableBalance, 'XAF') : '—'} footer={<span className="text-onSurfaceVariant">Revenu − retraits payés</span>} />
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-4">
        <Card>
          <CardTitle>Évolution des revenus (marge JAL)</CardTitle>
          {breakdown.length === 0 ? (
            <div className="py-10 text-center text-sm text-onSurfaceVariant">Aucune transaction sur cette période.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={[...breakdown].reverse().map((r) => ({ ...r, revenue: Number(r.revenueTotal) }))}>
                <CartesianGrid stroke="#232323" vertical={false} />
                <XAxis dataKey="date" stroke="#8a8680" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8a8680" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1C1B1B', border: '1px solid #232323', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" name="Revenu (marge JAL)" stroke="#22C55E" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Solde & Retraits</CardTitle>
          <div className="space-y-1.5 text-sm">
            <Row label="Solde disponible" value={<span className="text-success">{summary ? formatAmount(summary.availableBalance, 'XAF') : '—'}</span>} />
            <Row label="Total retiré" value={summary ? formatAmount(summary.totalWithdrawn, 'XAF') : '—'} />
          </div>
          <Button variant="primary" className="mt-3 w-full justify-center" onClick={requestWithdrawal}>🏦 Effectuer un retrait</Button>

          <div className="mt-4 text-xs font-bold tracking-wide text-onSurfaceVariant">DERNIERS RETRAITS</div>
          <div className="mt-2 space-y-2">
            {withdrawals.slice(0, 6).map((w) => (
              <div key={w.id} className="flex items-center justify-between text-xs">
                <span>{w.admin.email}</span>
                <span className="text-onSurfaceVariant">{formatAmount(w.amount)} {w.currency}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={WITHDRAWAL_TONE[w.status]}>{WITHDRAWAL_LABELS[w.status]}</Badge>
                  {w.status === 'PENDING' && (
                    <button className="text-primary" onClick={() => financeApi.markPaid(w.id).then(load)}>Marquer payé</button>
                  )}
                </div>
              </div>
            ))}
            {withdrawals.length === 0 && <div className="text-xs text-onSurfaceVariant">Aucun retrait.</div>}
          </div>
        </Card>
      </div>

      <Card padded={false} className="mt-4">
        <div className="p-5 pb-3"><CardTitle>Résumé financier par période</CardTitle></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                {['Date', 'Revenu total', 'Frais & charges', 'Bénéfice net', 'Marge (%)'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breakdown.map((r) => (
                <tr key={r.date} className="border-b border-border/60">
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(r.date)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatAmount(r.revenueTotal)} XAF</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatAmount(r.feesAndCharges)} XAF</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-success">{formatAmount(r.netProfit)} XAF</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{r.marginPct}%</td>
                </tr>
              ))}
              {breakdown.length > 0 && (
                <tr className="font-semibold">
                  <td className="whitespace-nowrap px-4 py-2.5">TOTAL</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-success">{formatAmount(totals.revenue)} XAF</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatAmount(totals.fees)} XAF</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-success">{formatAmount(totals.net)} XAF</td>
                  <td className="whitespace-nowrap px-4 py-2.5">—</td>
                </tr>
              )}
              {breakdown.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-onSurfaceVariant">Aucune donnée.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-onSurfaceVariant">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
