import { useEffect, useState } from 'react';
import { Wallet, Download, DollarSign, Cpu, Wand2, CalendarClock, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, CardTitle, StatCard, Button } from '../components/ui';
import { financeApi } from '../lib/api';
import { formatAmount, formatDate } from '../lib/format';
import { hasPermission } from '../lib/auth';

type Summary = Awaited<ReturnType<typeof financeApi.summary>>;
type Breakdown = Awaited<ReturnType<typeof financeApi.periodBreakdown>>;
/**
 * `commissions`/`netProfit` deliberately equal `revenueTotal` here — no
 * separate commission/cost ledger exists in the real schema (see
 * FinanceService's doc comment). The revenue-breakdown donut the mockup
 * shows with 4 slices is replaced by a single real category rather than
 * invented ones. "Imprimer"/"Planifier un rapport" had no real backing and
 * were dropped rather than left as dead buttons.
 */
export default function FinancePage() {
  const canExport = hasPermission('EXPORT_FINANCIAL_REPORTS');
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown>([]);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    Promise.all([financeApi.summary(dateFrom, dateTo), financeApi.periodBreakdown(dateFrom, dateTo)])
      .then(([s, b]) => {
        setSummary(s);
        setBreakdown(b);
      })
      .catch(() => setError(true));
  }

  useEffect(load, [dateFrom, dateTo]);

  const totals = breakdown.reduce(
    (acc, r) => ({ revenue: acc.revenue + Number(r.revenueTotal), fees: acc.fees + Number(r.feesAndCharges), net: acc.net + Number(r.netProfit) }),
    { revenue: 0, fees: 0, net: 0 },
  );

  return (
    <Screen
      topbarRight={
        <div className="hidden items-center gap-2 rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurfaceVariant lg:flex">
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
        subtitle="Suivez les commissions et frais de service, sans conservation de fonds clients."
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurfaceVariant lg:hidden">
              <CalendarClock size={14} className="shrink-0" />
              <input aria-label="Date de debut" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
              <span aria-hidden="true">-</span>
              <input aria-label="Date de fin" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
            </div>
            {canExport && <Button variant="primary" icon={Download} onClick={() => financeApi.export(dateFrom, dateTo)} className="w-full sm:w-auto">Exporter (CSV)</Button>}
          </div>
        }
      />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={DollarSign} iconTone="success" label="Revenu total" value={summary ? formatAmount(summary.revenueTotal, 'XAF') : '—'} />
        <StatCard icon={Cpu} iconTone="info" label="Commissions" value={summary ? formatAmount(summary.commissions, 'XAF') : '—'} footer={<span className="text-onSurfaceVariant">= revenu total (pas de ledger de coûts distinct)</span>} />
        <StatCard icon={Wand2} iconTone="warning" label="Bénéfice net" value={summary ? formatAmount(summary.netProfit, 'XAF') : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
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
          <CardTitle>Mode non-custodial</CardTitle>
          <div className="rounded-md border border-success/25 bg-success/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-success"><ShieldCheck size={17} /> Fonds sous contrôle du client</div>
            <p className="mt-2 leading-5 text-onSurfaceVariant">JAL Trade ne détient, ne stocke et ne retire aucun solde de portefeuille client.</p>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div><div className="font-medium text-onSurface">Rapports disponibles</div><div className="mt-0.5 text-xs leading-5 text-onSurfaceVariant">Volumes, commissions, frais de service et performance par période.</div></div>
            <div><div className="font-medium text-onSurface">Transactions transparentes</div><div className="mt-0.5 text-xs leading-5 text-onSurfaceVariant">Les actifs numériques sont envoyés entre les fournisseurs et les wallets externes.</div></div>
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
