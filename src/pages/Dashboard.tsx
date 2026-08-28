import { AlertTriangle, AreaChart as AreaChartIcon, BarChart3, Calendar, ChevronRight, FileBarChart, Home, IdCard, LineChart as LineChartIcon, Lock, Plug2, RefreshCw, Repeat, Sliders, TrendingUp, Users, Wallet } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardTitle, StatCard } from '../components/ui';
import { Screen, PageHeader } from '../layout/Screen';
import { dashboardApi } from '../lib/api';
import { formatAmount, formatPct } from '../lib/format';

const PALETTE = ['#22C55E', '#3B82F6', '#F5B300', '#A855F7', '#6B7280'];
const alertToneClasses: Record<string, string> = {
  critical: 'border-error/30 bg-error/10 text-error',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-info/30 bg-info/10 text-info',
};

type Summary = Awaited<ReturnType<typeof dashboardApi.summary>>;
type Charts = Awaited<ReturnType<typeof dashboardApi.charts>>;
type Acquisition = Awaited<ReturnType<typeof dashboardApi.acquisition>>;
type Alerts = Awaited<ReturnType<typeof dashboardApi.alerts>>;
type DateRange = { startDate: string; endDate: string };
type RangePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';
type ChartStyle = 'line' | 'bar' | 'area';

const presetLabels: Record<RangePreset, string> = {
  today: "Aujourd'hui",
  yesterday: 'Hier',
  last7: '7 derniers jours',
  last30: '30 derniers jours',
  thisWeek: 'Cette semaine',
  lastWeek: 'Semaine dernière',
  thisMonth: 'Ce mois-ci',
  lastMonth: 'Mois dernier',
  custom: 'Période personnalisée',
};

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function shiftDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function firstDayOfWeek(date: Date): Date {
  const result = new Date(date);
  const weekDay = result.getDay() || 7;
  result.setDate(result.getDate() - weekDay + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function rangeForPreset(preset: Exclude<RangePreset, 'custom'>, now = new Date()): DateRange {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = shiftDays(today, -1);
  switch (preset) {
    case 'today': return { startDate: toIsoDate(today), endDate: toIsoDate(today) };
    case 'yesterday': return { startDate: toIsoDate(yesterday), endDate: toIsoDate(yesterday) };
    case 'last7': return { startDate: toIsoDate(shiftDays(today, -6)), endDate: toIsoDate(today) };
    case 'last30': return { startDate: toIsoDate(shiftDays(today, -29)), endDate: toIsoDate(today) };
    case 'thisWeek': return { startDate: toIsoDate(firstDayOfWeek(today)), endDate: toIsoDate(today) };
    case 'lastWeek': {
      const thisWeek = firstDayOfWeek(today);
      return { startDate: toIsoDate(shiftDays(thisWeek, -7)), endDate: toIsoDate(shiftDays(thisWeek, -1)) };
    }
    case 'thisMonth': return { startDate: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: toIsoDate(today) };
    case 'lastMonth': return { startDate: toIsoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)), endDate: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 0)) };
  }
}

function readableRange(range: DateRange): string {
  const format = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const start = format.format(fromIsoDate(range.startDate));
  const end = format.format(fromIsoDate(range.endDate));
  return start === end ? start : `${start} – ${end}`;
}

function Donut({ data }: { data: { name: string; percent: number; color: string }[] }) {
  return (
    <ResponsiveContainer width={110} height={110}>
      <PieChart>
        <Pie data={data} dataKey="percent" nameKey="name" innerRadius={34} outerRadius={52} startAngle={90} endAngle={-270}>
          {data.map((item) => <Cell key={item.name} fill={item.color} stroke="none" />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function VolumeChart({ data, style }: { data: Array<{ date: string; volume: number }>; style: ChartStyle }) {
  const chartProps = { data, margin: { top: 6, right: 4, left: -10, bottom: 0 } };
  const commonAxes = (
    <>
      <CartesianGrid stroke="#232323" vertical={false} />
      <XAxis dataKey="date" stroke="#8a8680" fontSize={10} tickLine={false} axisLine={false} />
      <YAxis stroke="#8a8680" fontSize={10} tickLine={false} axisLine={false} />
      <Tooltip contentStyle={{ background: '#1C1B1B', border: '1px solid #232323', fontSize: 12 }} formatter={(value) => [formatAmount(Number(value), 'XAF'), 'Volume']} />
    </>
  );

  if (style === 'bar') return <BarChart {...chartProps}>{commonAxes}<Bar dataKey="volume" fill="#F5B300" radius={[4, 4, 0, 0]} /></BarChart>;
  if (style === 'area') return <AreaChart {...chartProps}>{commonAxes}<Area type="monotone" dataKey="volume" stroke="#F5B300" fill="#F5B300" fillOpacity={0.22} strokeWidth={2} /></AreaChart>;
  return <LineChart {...chartProps}>{commonAxes}<Line type="monotone" dataKey="volume" stroke="#F5B300" strokeWidth={2} dot={{ r: 3, fill: '#F5B300' }} /></LineChart>;
}

export default function DashboardPage() {
  const [preset, setPreset] = useState<RangePreset>('today');
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('today'));
  const [chartStyle, setChartStyle] = useState<ChartStyle>('line');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null);
  const [alerts, setAlerts] = useState<Alerts>([]);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([dashboardApi.summary(range), dashboardApi.charts(range), dashboardApi.acquisition(range), dashboardApi.alerts()])
      .then(([nextSummary, nextCharts, nextAcquisition, nextAlerts]) => {
        setSummary(nextSummary);
        setCharts(nextCharts);
        setAcquisition(nextAcquisition);
        setAlerts(nextAlerts);
      })
      .catch(() => setError(true));
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const handlePreset = (nextPreset: RangePreset) => {
    setPreset(nextPreset);
    if (nextPreset !== 'custom') setRange(rangeForPreset(nextPreset));
  };

  const volumeSeries = useMemo(
    () => (charts?.volumeSeries ?? []).map((item) => ({ date: item.date.slice(5), volume: Number(item.volume) })),
    [charts],
  );
  const buyVsSell = charts ? [
    { name: 'Achats', value: charts.achatVsVente.achat, percent: formatPct((charts.achatVsVente.achat / (charts.achatVsVente.total || 1)) * 100, { sign: false }), color: '#22C55E' },
    { name: 'Ventes', value: charts.achatVsVente.vente, percent: formatPct((charts.achatVsVente.vente / (charts.achatVsVente.total || 1)) * 100, { sign: false }), color: '#EF4444' },
  ] : [];
  const periodLabel = readableRange(range);
  const acquisitionLabels: Record<Acquisition['sources'][number]['source'], string> = {
    REFERRAL: 'Recommandation',
    PAID_ADS: 'Publicité en ligne',
    SOCIAL_MEDIA: 'Réseaux sociaux',
    AMBASSADOR_OR_PROMO: 'Créateur / code promo',
    WEB_OR_OTHER: 'Recherche web / autre',
    NOT_RECORDED: 'Non renseignée',
  };

  return (
    <Screen
      topbarRight={
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-md border border-border bg-surface-higher px-3 py-2 text-xs text-onSurfaceVariant lg:flex">
            <Calendar size={14} /> {periodLabel}
          </div>
          <button onClick={load} aria-label="Actualiser le tableau de bord" className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-onSurfaceVariant hover:text-onSurface">
            <RefreshCw size={15} />
          </button>
        </div>
      }
    >
      <PageHeader icon={Home} title="Dashboard" subtitle="Vue d'ensemble de l'activité de JAL Trade" />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-bold tracking-wide text-onSurfaceVariant">PÉRIODE GLOBALE</div>
            <div className="mt-1 text-sm font-semibold">{periodLabel}</div>
            <div className="mt-0.5 text-xs text-onSurfaceVariant">Tous les indicateurs et graphiques utilisent cette même période.</div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-onSurfaceVariant">
              Raccourci
              <select value={preset} onChange={(event) => handlePreset(event.target.value as RangePreset)} className="mt-1 block rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurface outline-none focus:border-primary">
                {Object.entries(presetLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            {preset === 'custom' && (
              <>
                <label className="text-xs text-onSurfaceVariant">Du<input type="date" value={range.startDate} max={range.endDate} onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))} className="mt-1 block rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurface outline-none focus:border-primary" /></label>
                <label className="text-xs text-onSurfaceVariant">Au<input type="date" value={range.endDate} min={range.startDate} onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))} className="mt-1 block rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurface outline-none focus:border-primary" /></label>
              </>
            )}
          </div>
        </div>
      </Card>

      {error && <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend ({import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'}).</div>}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label={`Volume traité · ${periodLabel}`} value={summary ? formatAmount(summary.volume, 'XAF') : '—'} delta={summary ? formatPct(summary.volumeChangePct) : undefined} deltaLabel="vs période précédente" />
        <StatCard icon={Repeat} iconTone="info" label={`Transactions · ${periodLabel}`} value={summary?.transactionsCount ?? '—'} delta={summary ? formatPct(summary.transactionsChangePct) : undefined} deltaLabel="vs période précédente" footer={summary && <span className="ml-1 text-onSurfaceVariant">Achats {summary.achatCount} | Ventes {summary.venteCount}</span>} />
        <StatCard icon={TrendingUp} iconTone="purple" label={`Marge brute · ${periodLabel}`} value={summary ? formatAmount(summary.grossMargin, 'XAF') : '—'} delta={summary ? formatPct(summary.grossMarginChangePct) : undefined} deltaLabel="vs période précédente" />
        <StatCard icon={Wallet} iconTone="success" label="Résultat net estimé" value={summary ? formatAmount(summary.netResultEstimate, 'XAF') : '—'} delta={summary ? formatPct(summary.netResultChangePct) : undefined} deltaLabel="vs période précédente" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} iconTone="info" label="Utilisateurs actifs" value={summary?.activeUsers ?? '—'} />
        <StatCard icon={IdCard} label="KYC en attente" value={summary?.kycPending ?? '—'} footer={<Link to="/kyc" className="font-semibold text-primary">Voir la file →</Link>} />
        <StatCard icon={Lock} iconTone="error" label="Transactions bloquées" value={summary?.blockedTransactions ?? '—'} footer={<Link to="/transactions" className="font-semibold text-primary">Voir la liste →</Link>} />
        <StatCard icon={AlertTriangle} iconTone="warning" label={`Taux d'erreur · ${periodLabel}`} value={summary ? `${summary.errorRatePct}%` : '—'} />
      </div>

      <Card className="mb-4">
        <div className="mb-3 text-xs font-bold tracking-wide text-onSurfaceVariant">ALERTES SYSTÈME</div>
        {alerts.length === 0 ? <div className="text-sm text-onSurfaceVariant">Aucune alerte active.</div> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {alerts.map((alert, index) => <div key={`${alert.title}-${index}`} className={`rounded-md border p-3 text-xs ${alertToneClasses[alert.severity]}`}><div className="font-semibold">{alert.title}</div><div className="mt-0.5 opacity-80">{alert.detail}</div></div>)}
          </div>
        )}
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardTitle action={<div className="flex gap-1 rounded-md bg-surface-higher p-0.5 text-xs"><button aria-label="Graphique en ligne" onClick={() => setChartStyle('line')} className={`rounded px-2 py-1 ${chartStyle === 'line' ? 'bg-primary-container text-primary-onContainer' : 'text-onSurfaceVariant'}`}><LineChartIcon size={14} /></button><button aria-label="Graphique à barres" onClick={() => setChartStyle('bar')} className={`rounded px-2 py-1 ${chartStyle === 'bar' ? 'bg-primary-container text-primary-onContainer' : 'text-onSurfaceVariant'}`}><BarChart3 size={14} /></button><button aria-label="Graphique en aires" onClick={() => setChartStyle('area')} className={`rounded px-2 py-1 ${chartStyle === 'area' ? 'bg-primary-container text-primary-onContainer' : 'text-onSurfaceVariant'}`}><AreaChartIcon size={14} /></button></div>}>VOLUME TRAITÉ</CardTitle>
          <ResponsiveContainer width="100%" height={200}><VolumeChart data={volumeSeries} style={chartStyle} /></ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>ACHATS VS VENTES</CardTitle>
          <div className="flex items-center gap-4"><div className="relative"><Donut data={buyVsSell.map((item) => ({ name: item.name, percent: item.value, color: item.color }))} /><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-bold">{charts?.achatVsVente.total ?? 0}</span><span className="text-[9px] text-onSurfaceVariant">Total</span></div></div><div className="space-y-2 text-xs">{buyVsSell.map((item) => <div key={item.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} /><span className="text-onSurfaceVariant">{item.name}</span><span className="font-semibold">{item.value} ({item.percent})</span></div>)}</div></div>
        </Card>

        <Card>
          <CardTitle>RÉPARTITION PAR PAYS</CardTitle>
          <div className="flex items-center gap-4"><Donut data={(charts?.byCountry ?? []).map((item, index) => ({ name: item.key, percent: item.pct, color: PALETTE[index % PALETTE.length] }))} /><div className="space-y-1.5 text-xs">{(charts?.byCountry ?? []).map((item, index) => <div key={item.key} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-onSurfaceVariant"><span className="h-2 w-2 rounded-full" style={{ background: PALETTE[index % PALETTE.length] }} />{item.key}</span><span className="font-semibold">{item.pct}%</span></div>)}</div></div>
        </Card>
      </div>

      <Card className="mb-4" padded={false}>
        <div className="p-4 pb-2 sm:p-5 sm:pb-3">
          <CardTitle>ACQUISITION UTILISATEURS</CardTitle>
          <p className="-mt-3 text-xs text-onSurfaceVariant">Origine déclarée à l'inscription et part des utilisateurs ayant initié au moins une transaction.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-onSurfaceVariant"><th className="px-4 py-3 font-medium">Canal</th><th className="px-4 py-3 font-medium">Inscriptions</th><th className="px-4 py-3 font-medium">Répartition</th><th className="px-4 py-3 font-medium">Utilisateurs activés</th><th className="px-4 py-3 font-medium">Taux d'activation</th></tr></thead>
            <tbody>
              {(acquisition?.sources ?? []).filter((row) => row.registrations > 0).map((row) => <tr key={row.source} className="border-b border-border/60"><td className="px-4 py-3 font-medium">{acquisitionLabels[row.source]}</td><td className="px-4 py-3">{row.registrations}</td><td className="px-4 py-3"><div className="flex min-w-[150px] items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-surface-highest"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${row.sharePct}%` }} /></div><span className="w-10 text-right text-xs text-onSurfaceVariant">{row.sharePct}%</span></div></td><td className="px-4 py-3">{row.activeUsers}</td><td className="px-4 py-3 font-semibold text-success">{row.activationRatePct}%</td></tr>)}
              {!acquisition && <tr><td colSpan={5} className="px-4 py-6 text-center text-onSurfaceVariant">Chargement des indicateurs d'acquisition…</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardTitle>RÉPARTITION PAR FOURNISSEUR</CardTitle><div className="flex items-center gap-4"><Donut data={(charts?.byProvider ?? []).map((item, index) => ({ name: item.key, percent: item.pct, color: PALETTE[index % PALETTE.length] }))} /><div className="space-y-1.5 text-xs">{(charts?.byProvider ?? []).map((item, index) => <div key={item.key} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: PALETTE[index % PALETTE.length] }} /><span className="text-onSurfaceVariant">{item.key}</span><span className="font-semibold">{item.pct}%</span></div>)}</div></div></Card>
        <Card><CardTitle>RÉPARTITION PAR CRYPTO</CardTitle><div className="flex items-center gap-4"><Donut data={(charts?.byCrypto ?? []).map((item, index) => ({ name: item.key, percent: item.pct, color: PALETTE[index % PALETTE.length] }))} /><div className="space-y-1.5 text-xs">{(charts?.byCrypto ?? []).map((item, index) => <div key={item.key} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: PALETTE[index % PALETTE.length] }} /><span className="text-onSurfaceVariant">{item.key}</span><span className="font-semibold">{item.pct}%</span></div>)}</div></div></Card>
        <Card><CardTitle>VOLUME PAR CRYPTO</CardTitle><div className="space-y-2.5">{(charts?.byCrypto ?? []).map((crypto) => <div key={crypto.key} className="text-xs"><div className="mb-1 flex justify-between"><span className="font-medium">{crypto.key}</span><span className="text-onSurfaceVariant">{formatAmount(crypto.volume)} XAF</span></div><div className="h-1.5 rounded-full bg-surface-highest"><div className="h-1.5 rounded-full bg-success" style={{ width: `${crypto.pct}%` }} /></div></div>)}</div></Card>
        <Card><CardTitle>ACTIONS RAPIDES</CardTitle><div className="space-y-1">{[{ icon: Sliders, label: 'Ajuster les taux', sub: 'Mettre à jour les marges', to: '/taux-marges' }, { icon: Plug2, label: 'Gérer les fournisseurs', sub: 'Disponibilité et priorités', to: '/fournisseurs' }, { icon: FileBarChart, label: 'Voir les rapports', sub: 'Exporter les données', to: '/finance' }].map((action) => <Link key={action.label} to={action.to} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-higher"><action.icon size={16} className="text-primary" /><div className="flex-1"><div className="text-xs font-medium">{action.label}</div><div className="text-[10px] text-onSurfaceVariant">{action.sub}</div></div><ChevronRight size={14} className="text-outline" /></Link>)}</div></Card>
      </div>
    </Screen>
  );
}
