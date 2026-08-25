import { Home, RefreshCw, Calendar, Repeat, TrendingUp, Wallet, Users, IdCard, Lock, AlertTriangle, ChevronRight, Sliders, Plug2, FileBarChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, CardTitle, StatCard } from '../components/ui';
import { dashboardApi } from '../lib/api';
import { formatAmount, formatPct } from '../lib/format';

const PALETTE = ['#22C55E', '#3B82F6', '#F5B300', '#A855F7', '#6B7280'];
const alertToneClasses: Record<string, string> = {
  critical: 'border-error/30 bg-error/10 text-error',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-info/30 bg-info/10 text-info',
};

function Donut({ data }: { data: { name: string; percent: number; color: string }[] }) {
  return (
    <ResponsiveContainer width={110} height={110}>
      <PieChart>
        <Pie data={data} dataKey="percent" nameKey="name" innerRadius={34} outerRadius={52} startAngle={90} endAngle={-270}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} stroke="none" />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

type Summary = Awaited<ReturnType<typeof dashboardApi.summary>>;
type Charts = Awaited<ReturnType<typeof dashboardApi.charts>>;
type Alerts = Awaited<ReturnType<typeof dashboardApi.alerts>>;

export default function DashboardPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [alerts, setAlerts] = useState<Alerts>([]);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([dashboardApi.summary(), dashboardApi.charts(range), dashboardApi.alerts()])
      .then(([s, c, a]) => {
        setSummary(s);
        setCharts(c);
        setAlerts(a);
      })
      .catch(() => setError(true));
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const buyVsSell = charts
    ? [
        { name: 'Achats', value: charts.achatVsVente.achat, percent: formatPct((charts.achatVsVente.achat / (charts.achatVsVente.total || 1)) * 100, { sign: false }), color: '#22C55E' },
        { name: 'Ventes', value: charts.achatVsVente.vente, percent: formatPct((charts.achatVsVente.vente / (charts.achatVsVente.total || 1)) * 100, { sign: false }), color: '#EF4444' },
      ]
    : [];

  return (
    <Screen
      topbarRight={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurfaceVariant">
            <Calendar size={14} />
            Aujourd'hui
          </div>
          <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-onSurfaceVariant hover:text-onSurface">
            <RefreshCw size={15} />
          </button>
        </div>
      }
    >
      <PageHeader icon={Home} title="Dashboard" subtitle="Vue d'ensemble de l'activité de JAL Trade" />

      {error && (
        <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          Impossible de contacter le serveur backend ({import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'}).
        </div>
      )}

      {/* Primary stats */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Volume traité aujourd'hui" value={summary ? formatAmount(summary.volumeToday, 'XAF') : '—'} delta={summary ? formatPct(summary.volumeChangePct) : undefined} />
        <StatCard
          icon={Repeat}
          iconTone="info"
          label="Transactions aujourd'hui"
          value={summary?.transactionsToday ?? '—'}
          delta={summary ? formatPct(summary.transactionsChangePct) : undefined}
          footer={summary && <span className="ml-1 text-onSurfaceVariant">Achats {summary.achatCount} | Ventes {summary.venteCount}</span>}
        />
        <StatCard icon={TrendingUp} iconTone="purple" label="Marge brute aujourd'hui" value={summary ? formatAmount(summary.grossMarginToday, 'XAF') : '—'} delta={summary ? formatPct(summary.grossMarginChangePct) : undefined} />
        <StatCard icon={Wallet} iconTone="success" label="Résultat net estimé" value={summary ? formatAmount(summary.netResultEstimateToday, 'XAF') : '—'} delta={summary ? formatPct(summary.netResultChangePct) : undefined} />
      </div>

      {/* Secondary stats */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <StatCard icon={Users} iconTone="info" label="Utilisateurs actifs" value={summary?.activeUsers ?? '—'} />
        <StatCard icon={IdCard} label="KYC en attente" value={summary?.kycPending ?? '—'} footer={<Link to="/kyc" className="font-semibold text-primary">Voir la file →</Link>} />
        <StatCard icon={Lock} iconTone="error" label="Transactions bloquées" value={summary?.blockedTransactions ?? '—'} footer={<Link to="/transactions" className="font-semibold text-primary">Voir la liste →</Link>} />
        <StatCard icon={AlertTriangle} iconTone="warning" label="Taux d'erreur moyen" value={summary ? `${summary.errorRatePct}%` : '—'} />
      </div>

      {/* System alerts */}
      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wide text-onSurfaceVariant">ALERTES SYSTÈME</span>
        </div>
        {alerts.length === 0 ? (
          <div className="text-sm text-onSurfaceVariant">Aucune alerte active.</div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {alerts.map((a, i) => (
              <div key={i} className={`rounded-md border p-3 text-xs ${alertToneClasses[a.severity]}`}>
                <div className="font-semibold">{a.title}</div>
                <div className="mt-0.5 opacity-80">{a.detail}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Volume chart + donuts */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardTitle
            action={
              <div className="flex gap-1 rounded-md bg-surface-higher p-0.5 text-xs">
                {(['7d', '30d', '90d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`rounded px-2 py-1 ${range === r ? 'bg-primary-container text-primary-onContainer font-semibold' : 'text-onSurfaceVariant'}`}
                  >
                    {r.replace('d', ' jours')}
                  </button>
                ))}
              </div>
            }
          >
            VOLUME TRAITÉ
          </CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={(charts?.volumeSeries ?? []).map((d) => ({ date: d.date.slice(5), volume: Number(d.volume) }))}>
              <CartesianGrid stroke="#232323" vertical={false} />
              <XAxis dataKey="date" stroke="#8a8680" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#8a8680" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1C1B1B', border: '1px solid #232323', fontSize: 12 }} />
              <Line type="monotone" dataKey="volume" stroke="#F5B300" strokeWidth={2} dot={{ r: 3, fill: '#F5B300' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>ACHATS VS VENTES</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Donut data={buyVsSell.map((d) => ({ name: d.name, percent: d.value, color: d.color }))} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">{charts?.achatVsVente.total ?? 0}</span>
                <span className="text-[9px] text-onSurfaceVariant">Total</span>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              {buyVsSell.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-onSurfaceVariant">{d.name}</span>
                  <span className="font-semibold">{d.value} ({d.percent})</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>RÉPARTITION PAR PAYS</CardTitle>
          <div className="flex items-center gap-4">
            <Donut data={(charts?.byCountry ?? []).map((d, i) => ({ name: d.key, percent: d.pct, color: PALETTE[i % PALETTE.length] }))} />
            <div className="space-y-1.5 text-xs">
              {(charts?.byCountry ?? []).map((d, i) => (
                <div key={d.key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-onSurfaceVariant">
                    <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    {d.key}
                  </span>
                  <span className="font-semibold">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardTitle>RÉPARTITION PAR FOURNISSEUR</CardTitle>
          <div className="flex items-center gap-4">
            <Donut data={(charts?.byProvider ?? []).map((d, i) => ({ name: d.key, percent: d.pct, color: PALETTE[i % PALETTE.length] }))} />
            <div className="space-y-1.5 text-xs">
              {(charts?.byProvider ?? []).map((d, i) => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="text-onSurfaceVariant">{d.key}</span>
                  <span className="font-semibold">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>RÉPARTITION PAR CRYPTO</CardTitle>
          <div className="flex items-center gap-4">
            <Donut data={(charts?.byCrypto ?? []).map((d, i) => ({ name: d.key, percent: d.pct, color: PALETTE[i % PALETTE.length] }))} />
            <div className="space-y-1.5 text-xs">
              {(charts?.byCrypto ?? []).map((d, i) => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="text-onSurfaceVariant">{d.key}</span>
                  <span className="font-semibold">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>VOLUME PAR CRYPTO</CardTitle>
          <div className="space-y-2.5">
            {(charts?.byCrypto ?? []).map((c) => (
              <div key={c.key} className="text-xs">
                <div className="mb-1 flex justify-between">
                  <span className="font-medium">{c.key}</span>
                  <span className="text-onSurfaceVariant">{formatAmount(c.volume)} XAF</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-highest">
                  <div className="h-1.5 rounded-full bg-success" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>ACTIONS RAPIDES</CardTitle>
          <div className="space-y-1">
            {[
              { icon: Sliders, label: 'Ajuster les taux', sub: 'Mettre à jour les marges', to: '/taux-marges' },
              { icon: Plug2, label: 'Gérer les fournisseurs', sub: 'Disponibilité et priorités', to: '/fournisseurs' },
              { icon: FileBarChart, label: 'Voir les rapports', sub: 'Exporter les données', to: '/finance' },
            ].map((a) => (
              <Link key={a.label} to={a.to} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-higher">
                <a.icon size={16} className="text-primary" />
                <div className="flex-1">
                  <div className="text-xs font-medium">{a.label}</div>
                  <div className="text-[10px] text-onSurfaceVariant">{a.sub}</div>
                </div>
                <ChevronRight size={14} className="text-outline" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </Screen>
  );
}
